package org.immersivevideoplayer.questlauncher;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

public final class MainActivity extends Activity {
    private static final String PLAYER_URL =
        "https://georgefejer91.github.io/immersive-video-player/?launch=quest";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        openPlayer();
    }

    private void openPlayer() {
        Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse("systemux://browser"));
        browser.setClassName("com.oculus.vrshell", "com.oculus.vrshell.MainActivity");
        browser.putExtra("uri", PLAYER_URL + "&open=" + System.currentTimeMillis());
        try {
            startActivity(browser);
            finish();
        } catch (ActivityNotFoundException | SecurityException failure) {
            new AlertDialog.Builder(this)
                .setTitle("Immersive Video Player")
                .setMessage("Meta Quest Browser could not open. Use this launcher on your Quest headset.")
                .setPositiveButton("Retry", (dialog, button) -> openPlayer())
                .setNegativeButton("Close", (dialog, button) -> finish())
                .setOnCancelListener(dialog -> finish())
                .show();
        }
    }
}
