package com.csvbudgettracker

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/**
 * WidgetModule — JS bridge that stores the latest widget display values and
 * triggers a re-render. Called from src/widgets/widget.js whenever app data
 * changes. Only formatted strings/ints cross the bridge — no raw financial data
 * is persisted in plaintext beyond what the user chose to surface on a widget.
 */
class WidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetModule"

    @ReactMethod
    fun updateWidget(data: ReadableMap) {
        val prefs = reactContext.getSharedPreferences(
            BudgetWidgetProvider.PREFS,
            Context.MODE_PRIVATE
        )
        val editor = prefs.edit()
        if (data.hasKey("net")) editor.putString("today_net", data.getString("net"))
        if (data.hasKey("topCategory")) {
            editor.putString("top_category", data.getString("topCategory"))
        }
        if (data.hasKey("netColor")) editor.putString("net_color", data.getString("netColor"))
        if (data.hasKey("progress")) editor.putInt("progress", data.getInt("progress"))
        editor.apply()

        BudgetWidgetProvider.updateAll(reactContext)
    }
}
