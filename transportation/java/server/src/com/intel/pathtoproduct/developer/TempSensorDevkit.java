package com.intel.pathtoproduct.developer;

import com.intel.pathtoproduct.interfaces.ITempSensor;

import upm_grove.GroveTemp;

public class TempSensorDevkit implements ITempSensor {

    GroveTemp temp;

    public TempSensorDevkit() {
        this(1);
    }

    public TempSensorDevkit(int tempPin) {
        temp = new GroveTemp(tempPin, 0.66f);
    }

    @Override
    public float getTempCelsius() {
        return temp.value();
    }

    @Override
    public float getTempFahrenheit() {
        return temp.value() * 1.8f + 32;
    }
}
