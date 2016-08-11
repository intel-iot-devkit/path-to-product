package com.intel.pathtoproduct.commercial;
import com.intel.pathtoproduct.interfaces.ITempSensor;

import upm_t3311.*;

public class TempSensorCommercial implements ITempSensor {

    T3311 t3311;

    public TempSensorCommercial() {
        t3311 = new T3311("/dev/ttyS0", 1);
    }

    @Override
    public float getTempCelsius() {
        t3311.update();
        return t3311.getTemperature();
    }

    @Override
    public float getTempFahrenheit() {
        return getTempCelsius() * 1.8f + 32;
    }
}
