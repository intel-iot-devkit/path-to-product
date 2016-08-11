package com.intel.pathtoproduct;

import java.io.File;

import javax.servlet.ServletException;

import org.apache.catalina.Context;
import org.apache.catalina.LifecycleException;
import org.apache.catalina.startup.Tomcat;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;

import com.intel.pathtoproduct.commercial.DoorSensorCommercial;
import com.intel.pathtoproduct.commercial.FanManager;
import com.intel.pathtoproduct.commercial.TempSensorCommercial;
import com.intel.pathtoproduct.developer.DisplayDevkit;
import com.intel.pathtoproduct.developer.DoorSensorDevkit;
import com.intel.pathtoproduct.developer.LocalAlarmManager;
import com.intel.pathtoproduct.developer.TempSensorDevkit;
import com.intel.pathtoproduct.interfaces.IDoorSensor;
import com.intel.pathtoproduct.interfaces.ITempSensor;

public class JavaONEDemoMulti {

    static void setupServer(Tomcat tomcat, EventManager em, String path) throws ServletException {

        /* Add path as the main directory of the server */
        Context ctx = tomcat.addWebapp("", path);

        /* Initialize the servlets required for the webapps */
        Tomcat.addServlet(ctx, "DataServ", new DataServ(em, em));
        Tomcat.addServlet(ctx, "ThreshUpdate", new ThreshUpdate(em));
        Tomcat.addServlet(ctx, "BuzzerAck", new BuzzerAck(em));

        /* Map the servlets appropriately */
        ctx.addServletMapping("/ExpKit/threshold", "ThreshUpdate");
        ctx.addServletMapping("/ExpKit/buzzer", "BuzzerAck");
        ctx.addServletMapping("/ExpKit/getData", "DataServ");
    }

    @SuppressWarnings("unused")
    public static void main(String[] args) throws ServletException, LifecycleException, ParseException {
        DemoConfig config = DemoConfig.DEVKIT;
        File path = new File("/home/root/www");
        EventManager em = new EventManager();
        ITempSensor ts;
        IDoorSensor ds;
        LocalAlarmManager am;
        int subplatformOffset = 512;

        Options options = new Options();
        options.addOption("config", true, "Change configuration to 'devkit' or 'commercial'. Default is 'devkit'");
        options.addOption("webapp", true, "Change folder where the webapps are installed. Default is '/home/root/www'");
        options.addOption("firmata", false, "Use firmata extension board. Works with config 'devkit'");
        options.addOption("firmata_dev", true,
                "Supply firmata device path. Default is '/dev/ttyACM0'. Turns on firmata support.");

        CommandLineParser parser = new DefaultParser();
        CommandLine cli = parser.parse(options, args);

        if (cli.hasOption("config")) {
            String strConfig = cli.getOptionValue("config");
            if (strConfig.equals("devkit")) {
                config = DemoConfig.DEVKIT;
            } else if (strConfig.equals("commercial")) {
                config = DemoConfig.COMMERCIAL;
            } else {
                System.err.println("Unknown config option. Options are 'devkit' or 'commercial'");
                System.exit(1);
            }
        }

        if (cli.hasOption("webapp")) {
            String strPath = cli.getOptionValue("webapp");
            path = new File(strPath);
            if (!path.exists() || !path.isDirectory()) {
                System.err.println("Wrong path to webapp.");
                System.exit(1);
            }
        }

        if (config == DemoConfig.DEVKIT) {
            /* setup sensors for the developer kit */
            if (cli.hasOption("firmata") || cli.hasOption("firmata_dev")) {
                String devpath = "/dev/ttyACM0";
                if (cli.hasOption("firmata_dev"))
                    devpath = cli.getOptionValue("firmata_dev");
                if (mraa.mraa.addSubplatform(mraa.Platform.GENERIC_FIRMATA, devpath) != mraa.Result.SUCCESS) {
                    System.err.println("Could not configure firmata device on " + devpath);
                    System.exit(1);
                }
            }
            ts = new TempSensorDevkit(subplatformOffset + 1);
            ds = new DoorSensorDevkit(subplatformOffset + 2);
            am = new LocalAlarmManager(em, subplatformOffset + 5, subplatformOffset + 4, subplatformOffset + 3);
            em.addEventSink(am);
        } else if (config == DemoConfig.COMMERCIAL) {
            /* setup sensors for the commercial kit */
            ts = new TempSensorCommercial();
            ds = new DoorSensorCommercial();
        } else
            throw new RuntimeException("Configuration not supported");

        Tomcat tomcat = new Tomcat();
        tomcat.setPort(3095);

        setupServer(tomcat, em, path.getAbsolutePath());

        tomcat.start();

        if (config == DemoConfig.DEVKIT) {
            /*
             * Initialize an LCD display for the devkit The commercial kit comes with a webapp instead
             */
            DisplayDevkit ld = new DisplayDevkit(subplatformOffset);;
            em.addEventSink(ld);
        } else if (config == DemoConfig.COMMERCIAL) {
            /*
             * The commercial kit has a fan for cooling when the temperature exceeds the threshold.
             */
            FanManager fm = new FanManager();
            em.addEventSink(fm);
        }

        /* Set up temperature and door notifications */
        TempManager tm = new TempManager(ts, em);
        DoorManager dm = new DoorManager(ds, em);

        tomcat.getServer().await();
    }

}