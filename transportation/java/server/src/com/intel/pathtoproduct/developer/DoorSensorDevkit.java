package com.intel.pathtoproduct.developer;

import com.intel.pathtoproduct.interfaces.IDoorSensor;

import mraa.Edge;
import upm_grove.GroveButton;

public class DoorSensorDevkit implements IDoorSensor {

    GroveButton button;
    Runnable dispatch = null;
    boolean closed = true;

    public DoorSensorDevkit(int buttonPin) {
        button = new GroveButton(buttonPin);
        button.installISR(Edge.EDGE_BOTH.swigValue(), new Runnable() {

            @Override
            public void run() {
                if (button.value() == 0)
                    return;
                closed = !closed;
                if (dispatch != null)
                    dispatch.run();
            }
        });
    }

    public DoorSensorDevkit() {
        this(2);
    }

    @Override
    public void setCallback(Runnable r) {
        dispatch = r;
    }

    @Override
    public boolean isClosed() {
        return closed;
    }
    
    
}
