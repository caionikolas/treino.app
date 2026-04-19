package com.treinoapp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.MediaPlayer
import android.net.Uri
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import kotlin.random.Random

class MusicService : Service() {

    companion object {
        const val CHANNEL_ID = "music-playback"
        const val NOTIFICATION_ID = 7001
        const val ACTION_PLAY = "com.treinoapp.music.PLAY"
        const val ACTION_PAUSE = "com.treinoapp.music.PAUSE"
        const val ACTION_NEXT = "com.treinoapp.music.NEXT"
        const val ACTION_PREV = "com.treinoapp.music.PREV"
        const val ACTION_STOP = "com.treinoapp.music.STOP"
    }

    inner class MusicBinder : Binder() {
        val service: MusicService get() = this@MusicService
    }

    private val binder = MusicBinder()
    override fun onBind(intent: Intent?): IBinder = binder

    var eventEmitter: ((String, WritableMap?) -> Unit)? = null

    private var mediaPlayer: MediaPlayer? = null
    private lateinit var mediaSession: MediaSessionCompat

    private data class Track(
        val id: String,
        val uri: String,
        val title: String,
        val artist: String,
        val album: String,
        val durationMs: Long,
        val artworkUri: String?,
    )

    private val queue = mutableListOf<Track>()
    private var index: Int = 0
    private var shuffle: Boolean = false
    private var repeat: String = "off"
    private var isStarted = false

    override fun onCreate() {
        super.onCreate()
        createChannel()
        mediaSession = MediaSessionCompat(this, "TreinoAppMusic").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() { play() }
                override fun onPause() { pause() }
                override fun onSkipToNext() { next() }
                override fun onSkipToPrevious() { previous() }
                override fun onSeekTo(pos: Long) { seekTo(pos) }
                override fun onStop() { stopPlayback() }
            })
            isActive = true
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> play()
            ACTION_PAUSE -> pause()
            ACTION_NEXT -> next()
            ACTION_PREV -> previous()
            ACTION_STOP -> stopPlayback()
        }
        return START_STICKY
    }

    fun setQueue(tracks: ReadableArray, startIndex: Int) {
        queue.clear()
        for (i in 0 until tracks.size()) {
            val map = tracks.getMap(i)
            queue.add(
                Track(
                    id = map.getString("id") ?: "",
                    uri = map.getString("uri") ?: "",
                    title = map.getString("title") ?: "",
                    artist = map.getString("artist") ?: "",
                    album = map.getString("album") ?: "",
                    durationMs = map.getDouble("durationMs").toLong(),
                    artworkUri = map.getString("artworkUri"),
                ),
            )
        }
        index = startIndex.coerceIn(0, (queue.size - 1).coerceAtLeast(0))
        loadAndPlay()
    }

    private fun loadAndPlay() {
        if (queue.isEmpty()) return
        val track = queue[index]
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@MusicService, Uri.parse(track.uri))
                setOnPreparedListener {
                    start()
                    emitTrack()
                    emitState()
                    updateMediaSession()
                    startForegroundWithNotification()
                }
                setOnCompletionListener { onTrackFinished() }
                setOnErrorListener { _, _, _ ->
                    emitEvent("onError", Arguments.createMap().apply {
                        putString("message", "Erro ao reproduzir: ${track.title}")
                    })
                    next()
                    true
                }
                prepareAsync()
            }
        } catch (e: Exception) {
            emitEvent("onError", Arguments.createMap().apply { putString("message", e.message) })
            next()
        }
    }

    fun play() {
        val mp = mediaPlayer ?: run { if (queue.isNotEmpty()) loadAndPlay(); return }
        if (!mp.isPlaying) {
            mp.start()
            emitState()
            updateMediaSession()
            startForegroundWithNotification()
        }
    }

    fun pause() {
        mediaPlayer?.takeIf { it.isPlaying }?.pause()
        emitState()
        updateMediaSession()
        startForegroundWithNotification()
    }

    fun next() {
        if (queue.isEmpty()) return
        index = when {
            shuffle && queue.size > 1 -> {
                var n = Random.nextInt(queue.size)
                while (n == index) n = Random.nextInt(queue.size)
                n
            }
            index < queue.size - 1 -> index + 1
            repeat == "all" -> 0
            else -> { stopPlayback(); return }
        }
        loadAndPlay()
    }

    fun previous() {
        val mp = mediaPlayer
        if (mp != null && mp.currentPosition > 3000) {
            mp.seekTo(0)
            return
        }
        if (queue.isEmpty()) return
        index = if (index > 0) index - 1 else if (repeat == "all") queue.size - 1 else 0
        loadAndPlay()
    }

    fun seekTo(positionMs: Long) {
        mediaPlayer?.seekTo(positionMs.toInt())
        updateMediaSession()
    }

    fun setShuffle(enabled: Boolean) {
        shuffle = enabled
        emitState()
    }

    fun setRepeat(mode: String) {
        repeat = if (mode in listOf("off", "one", "all")) mode else "off"
        emitState()
    }

    fun getPosition(): Long = try {
        mediaPlayer?.currentPosition?.toLong() ?: 0L
    } catch (e: Exception) { 0L }

    fun stopPlayback() {
        mediaPlayer?.release()
        mediaPlayer = null
        emitState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        isStarted = false
    }

    private fun onTrackFinished() {
        if (repeat == "one") {
            mediaPlayer?.seekTo(0)
            mediaPlayer?.start()
            return
        }
        next()
    }

    private fun emitTrack() {
        if (queue.isEmpty()) {
            emitEvent("onTrackChanged", null)
            return
        }
        val t = queue[index]
        val map = Arguments.createMap().apply {
            putString("id", t.id)
            putString("uri", t.uri)
            putString("title", t.title)
            putString("artist", t.artist)
            putString("album", t.album)
            putDouble("durationMs", t.durationMs.toDouble())
            putString("artworkUri", t.artworkUri)
            putInt("queueIndex", index)
            putInt("queueLength", queue.size)
        }
        emitEvent("onTrackChanged", map)
    }

    private fun emitState() {
        val map = Arguments.createMap().apply {
            putBoolean("playing", mediaPlayer?.isPlaying ?: false)
            putBoolean("shuffle", shuffle)
            putString("repeat", repeat)
            putInt("queueIndex", index)
            putInt("queueLength", queue.size)
        }
        emitEvent("onStateChanged", map)
    }

    private fun emitEvent(name: String, params: WritableMap?) {
        eventEmitter?.invoke(name, params)
    }

    private fun updateMediaSession() {
        if (queue.isEmpty()) return
        val t = queue[index]
        val mp = mediaPlayer

        val metadata = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, t.title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, t.artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, t.album)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, t.durationMs)
            .build()
        mediaSession.setMetadata(metadata)

        val state = if (mp?.isPlaying == true) PlaybackStateCompat.STATE_PLAYING
        else PlaybackStateCompat.STATE_PAUSED
        val playbackState = PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_SEEK_TO or
                    PlaybackStateCompat.ACTION_STOP,
            )
            .setState(state, (mp?.currentPosition ?: 0).toLong(), 1.0f)
            .build()
        mediaSession.setPlaybackState(playbackState)
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Reprodução de música",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                setShowBadge(false)
                setSound(null, null)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun actionIntent(action: String): PendingIntent {
        val intent = Intent(this, MusicService::class.java).apply { this.action = action }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getService(this, action.hashCode(), intent, flags)
    }

    private fun openAppIntent(): PendingIntent {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getActivity(this, 0, intent, flags)
    }

    private fun loadArtwork(uriString: String?): android.graphics.Bitmap? {
        if (uriString == null) return null
        return try {
            contentResolver.openInputStream(Uri.parse(uriString))?.use {
                BitmapFactory.decodeStream(it)
            }
        } catch (e: Exception) { null }
    }

    private fun startForegroundWithNotification() {
        if (queue.isEmpty()) return
        val t = queue[index]
        val playing = mediaPlayer?.isPlaying ?: false

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(t.title)
            .setContentText(t.artist)
            .setLargeIcon(loadArtwork(t.artworkUri))
            .setContentIntent(openAppIntent())
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .addAction(
                android.R.drawable.ic_media_previous, "Anterior",
                actionIntent(ACTION_PREV),
            )
            .addAction(
                if (playing) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,
                if (playing) "Pausar" else "Tocar",
                actionIntent(if (playing) ACTION_PAUSE else ACTION_PLAY),
            )
            .addAction(
                android.R.drawable.ic_media_next, "Próxima",
                actionIntent(ACTION_NEXT),
            )
            .setStyle(
                MediaStyle()
                    .setMediaSession(mediaSession.sessionToken)
                    .setShowActionsInCompactView(0, 1, 2),
            )

        val notification: Notification = builder.build()
        if (!isStarted) {
            startForeground(NOTIFICATION_ID, notification)
            isStarted = true
        } else {
            getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)
        }
    }

    override fun onDestroy() {
        mediaPlayer?.release()
        mediaPlayer = null
        mediaSession.release()
        super.onDestroy()
    }
}
