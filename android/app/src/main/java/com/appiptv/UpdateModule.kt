package com.appiptv

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class UpdateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "UpdateModule"
    }

    @ReactMethod
    fun getCurrentVersionCode(promise: Promise) {
        try {
            val packageInfo = reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, 0)
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode
            }
            promise.resolve(versionCode)
        } catch (e: Exception) {
            promise.reject("VERSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun downloadAndInstallApk(apkUrl: String, versionName: String, promise: Promise) {
        try {
            Log.d("UpdateModule", "Starting download from: $apkUrl")
            val destination = File(reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "update.apk")
            if (destination.exists()) {
                destination.delete()
            }

            val request = DownloadManager.Request(Uri.parse(apkUrl))
                .setTitle("Actualizando Estranet TV")
                .setDescription("Descargando versión $versionName")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationUri(Uri.fromFile(destination))

            val downloadManager = reactApplicationContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val downloadId = downloadManager.enqueue(request)

            val onComplete = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                    if (id == downloadId) {
                        try {
                            reactApplicationContext.unregisterReceiver(this)
                        } catch (e: Exception) {
                            // Already unregistered
                        }

                        // Verificar si la descarga fue exitosa
                        val query = DownloadManager.Query().setFilterById(downloadId)
                        val cursor: Cursor = downloadManager.query(query)
                        if (cursor.moveToFirst()) {
                            val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                            val status = cursor.getInt(statusIndex)
                            
                            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                Log.d("UpdateModule", "Download successful. File size: ${destination.length()} bytes")
                                if (destination.exists() && destination.length() > 0) {
                                    installApk(destination, promise)
                                } else {
                                    promise.reject("INSTALL_ERROR", "El archivo descargado está vacío o no existe.")
                                }
                            } else {
                                val reasonIndex = cursor.getColumnIndex(DownloadManager.COLUMN_REASON)
                                val reason = cursor.getInt(reasonIndex)
                                Log.e("UpdateModule", "Download failed with status $status and reason $reason")
                                promise.reject("DOWNLOAD_FAILED", "La descarga falló. Código: $reason")
                            }
                        }
                        cursor.close()
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactApplicationContext.registerReceiver(onComplete, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED)
            } else {
                @Suppress("DEPRECATION")
                reactApplicationContext.registerReceiver(onComplete, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
            }

        } catch (e: Exception) {
            Log.e("UpdateModule", "Error in downloadAndInstallApk: ${e.message}")
            promise.reject("DOWNLOAD_ERROR", e.message)
        }
    }

    private fun installApk(file: File, promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_VIEW)
            val contentUri = FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.fileprovider",
                file
            )
            intent.setDataAndType(contentUri, "application/vnd.android.package-archive")
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INSTALL_ERROR", e.message)
        }
    }
}
