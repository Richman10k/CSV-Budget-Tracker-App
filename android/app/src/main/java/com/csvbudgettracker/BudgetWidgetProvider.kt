package com.csvbudgettracker

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.graphics.Color
import android.widget.RemoteViews

/**
 * Home-screen widget showing today's net, the month's top spending category and
 * a budget-usage bar. It never reads the encrypted database directly — the app
 * pushes already-formatted display values into SharedPreferences via
 * WidgetModule and this provider renders them.
 */
class BudgetWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            render(context, appWidgetManager, id)
        }
    }

    companion object {
        const val PREFS = "budget_widget"

        /** Re-render every placed instance of this widget. */
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, BudgetWidgetProvider::class.java)
            )
            for (id in ids) {
                render(context, manager, id)
            }
        }

        private fun render(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val net = prefs.getString("today_net", "—")
            val top = prefs.getString("top_category", "No spending yet")
            val netColor = prefs.getString("net_color", "#FFFFFF")
            val progress = prefs.getInt("progress", 0)

            val views = RemoteViews(context.packageName, R.layout.budget_widget)
            views.setTextViewText(R.id.widget_net, net)
            views.setTextViewText(R.id.widget_top, top)
            try {
                views.setTextColor(R.id.widget_net, Color.parseColor(netColor))
            } catch (e: Exception) {
                // keep default color on a bad value
            }
            views.setProgressBar(R.id.widget_progress, 100, progress, false)

            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launch != null) {
                val pending = PendingIntent.getActivity(
                    context,
                    0,
                    launch,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_root, pending)
            }

            manager.updateAppWidget(id, views)
        }
    }
}
