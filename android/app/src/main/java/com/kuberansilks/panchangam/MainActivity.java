package com.kuberansilks.panchangam;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Run OTA boot watchdog & cold-start staged bundle promotion BEFORE Bridge initializes
        OtaUpdaterPlugin.prepareOnAppLaunch(this);
        // Register native OTA Live Update Capacitor plugin
        registerPlugin(OtaUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
