package com.csvbudgettracker

import android.os.Build
import android.view.Display
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "CSVBudgetTracker"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onResume() {
    super.onResume()
    requestHighestRefreshRate()
  }

  /**
   * Ask the OS to drive this window at the display's highest available refresh
   * rate (e.g. 120 Hz on a Pixel 10 Pro). Reanimated then renders animations at
   * that rate. On 60/90 Hz panels this simply selects their maximum.
   */
  private fun requestHighestRefreshRate() {
    try {
      val display: Display? =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            display
          } else {
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay
          }
      val modes = display?.supportedModes ?: return
      val best = modes.maxByOrNull { it.refreshRate } ?: return
      val params = window.attributes
      params.preferredDisplayModeId = best.modeId
      // Hint the preferred refresh rate as well (older API path).
      params.preferredRefreshRate = best.refreshRate
      window.attributes = params
    } catch (e: Exception) {
      // Non-fatal: fall back to the system default refresh rate.
    }
  }
}
