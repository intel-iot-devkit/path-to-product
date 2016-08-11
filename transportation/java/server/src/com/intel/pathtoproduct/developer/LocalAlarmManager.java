package com.intel.pathtoproduct.developer;

import mraa.Edge;
import upm_buzzer.Buzzer;
import upm_buzzer.javaupm_buzzer;
import upm_grove.GroveLed;
import upm_ttp223.TTP223;

import com.intel.pathtoproduct.Event;
import com.intel.pathtoproduct.interfaces.IAlarmEventSink;
import com.intel.pathtoproduct.interfaces.IEventSink;

public class LocalAlarmManager implements IEventSink {

    boolean triggerAlarm = false;
    boolean alarmMuted = false;

    Thread buzzT;
    Thread blinkT;

    Buzzer buzzer;
    GroveLed led;
    TTP223 touch;

    IAlarmEventSink em;

    public LocalAlarmManager(IAlarmEventSink em, int buzzerPin, int ledPin, int touchPin) {

        this.em = em;

        buzzer = new Buzzer(buzzerPin);
        buzzer.setVolume(0.75f);

        led = new GroveLed(ledPin);
        led.off();

        touch = new TTP223(touchPin);
        touch.installISR(Edge.EDGE_BOTH.swigValue(), new Runnable() {

            @Override
            public void run() {
                if(touch.value() == 1){
                    muteAlarm();
                }
            }
        });
    }

    public LocalAlarmManager(IAlarmEventSink em) {
        this(em, 5, 4, 3);
    }

    @Override
    public void publishEvent(Event event) {
        if (event.getAlarmStatus() == true && !triggerAlarm) {
            startAlarm();
        } else if (event.getAlarmStatus() == false && triggerAlarm) {
            stopAlarm();
        }
    }

    void startAlarm() {
        triggerAlarm = true;
        alarmMuted = false;
        buzzT = new Thread(new Runnable() {

            @Override
            public void run() {
                try {
                    Thread.sleep(5000);
                    while (triggerAlarm && !alarmMuted) {
                        buzzer.playSound(javaupm_buzzer.DO, 200000);
                        Thread.sleep(200);
                    }
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        });

        blinkT = new Thread(new Runnable() {

            @Override
            public void run() {
                try {
                    Thread.sleep(5000);
                    if (triggerAlarm)
                        em.alarmTriggered();
                    while (triggerAlarm) {
                        led.on();
                        Thread.sleep(800);
                        led.off();
                        Thread.sleep(800);
                    }
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        });
        buzzT.start();
        blinkT.start();
    }

    void stopAlarm() {
        triggerAlarm = false;
        try {
            buzzT.join();
            blinkT.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        led.off();
    }

    void muteAlarm() {
        if (triggerAlarm && !alarmMuted) {
            alarmMuted = true;
            em.alarmMuted();
            try {
                buzzT.join();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}
