package com.treinoapp

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.net.Uri
import android.os.IBinder
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class MusicModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MusicModule"

    private var service: MusicService? = null
    private var bound = false

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            service = (binder as MusicService.MusicBinder).service
            service?.eventEmitter = { event, params -> sendEvent(event, params) }
            bound = true
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            service = null
            bound = false
        }
    }

    init {
        val intent = Intent(reactContext, MusicService::class.java)
        reactContext.startService(intent)
        reactContext.bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun queryAudio(promise: Promise) {
        try {
            val tracks: WritableArray = Arguments.createArray()
            val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.Audio.Media.DURATION,
            )
            val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
            val sortOrder = "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC"

            reactContext.contentResolver.query(collection, projection, selection, null, sortOrder)
                ?.use { cursor ->
                    val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                    val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                    val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                    val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                    val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
                    val durCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)

                    while (cursor.moveToNext()) {
                        val id = cursor.getLong(idCol)
                        val albumId = cursor.getLong(albumIdCol)
                        val trackUri = Uri.withAppendedPath(collection, id.toString()).toString()
                        val artworkUri =
                            Uri.parse("content://media/external/audio/albumart/$albumId").toString()

                        val map: WritableMap = Arguments.createMap().apply {
                            putString("id", id.toString())
                            putString("uri", trackUri)
                            putString("title", cursor.getString(titleCol) ?: "")
                            putString("artist", cursor.getString(artistCol) ?: "Desconhecido")
                            putString("album", cursor.getString(albumCol) ?: "")
                            putDouble("durationMs", cursor.getLong(durCol).toDouble())
                            putString("artworkUri", artworkUri)
                        }
                        tracks.pushMap(map)
                    }
                }
            promise.resolve(tracks)
        } catch (e: Exception) {
            promise.reject("QUERY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setQueue(tracks: ReadableArray, startIndex: Int, promise: Promise) {
        try {
            service?.setQueue(tracks, startIndex)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("QUEUE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun play() { service?.play() }

    @ReactMethod
    fun pause() { service?.pause() }

    @ReactMethod
    fun next() { service?.next() }

    @ReactMethod
    fun previous() { service?.previous() }

    @ReactMethod
    fun seekTo(positionMs: Double) { service?.seekTo(positionMs.toLong()) }

    @ReactMethod
    fun setShuffle(enabled: Boolean) { service?.setShuffle(enabled) }

    @ReactMethod
    fun setRepeat(mode: String) { service?.setRepeat(mode) }

    @ReactMethod
    fun getPosition(promise: Promise) {
        promise.resolve(service?.getPosition()?.toDouble() ?: 0.0)
    }

    @ReactMethod
    fun stop() { service?.stopPlayback() }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
