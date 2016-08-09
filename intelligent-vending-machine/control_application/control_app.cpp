/*
 * Vending Machine Demo
 *
 * An intelligent vending machine prototype using
 * Intel IoT Dev Kit (UPM library)
 *
 * Additional linker flags: -lupm-i2clcd -lupm-grove -lupm-uln200xa
 *
 * Author: Sergey Kiselev <sergey.kiselev@intel.com>
 * Copyright (c) 2015 Intel Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#include <upm/grove.hpp>
#include <upm/jhd1313m1.hpp>
// ULN200XA based motor driver
#include <upm/uln200xa.hpp>
// step motor driver with DIR/STEP
#include <upm/stepmotor.hpp>
// Comet temperature sensor
#include <upm/am2315.hpp>

#include <climits>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <unistd.h>

// libc: malloc, free
#include <stdlib.h>
// libc: string functions
#include <string.h>
// libc: time
#include <time.h>

// STL vector
#include <vector>
// STL iterator
#include <iterator>

// Sqlite
#include <sqlite3.h>

/*
 *  PROTOTYPE = 1 - Vending machine prototype built using IoT Dev Kit
 *  PROTOTYPE = 0 - Vending machine demo built using commercial IoT Dev Kit
 */
#if !defined PROTOTYPE
#define PROTOTYPE 1
#endif

/*
 * GALILEO = 1 - Vending machine built using Galileo
 * GALILEO = 0 - Vending machine built using an IoT gateway
 */
#if !defined GALILEO
#define GALILEO 0
#endif

/*
 * Hardware setup:
 * - I2C: Jhd1313m1 LCD display
 * - digital in (D6): button for sensing a failure
 * - analog in (A0): temperature sensor
 * - digital outs (D9-D12): stepper motor for dispensing products
 * - digital out (D7): red LED (failure / out of service)
 * - digital out (D8): green LED (OK status)
 *
 */
#if PROTOTYPE == 1
#if GALILEO == 1
/* Prototype using Galileo */
#define MRAA_OFFSET	0
#else
/* Prototype using NUC + Arduino 101 */
#define MRAA_OFFSET	512			/* Firmata offset */
#endif
#define TEMP_SENSOR_PIN	(0 + MRAA_OFFSET)
#define RED_LED_PIN	(3 + MRAA_OFFSET)
#define GREEN_LED_PIN	(4 + MRAA_OFFSET)
#define MOTOR_SENSE_PIN (8 + MRAA_OFFSET)
#define TRAY_SENSE_PIN	(2 + MRAA_OFFSET)
#define MOTOR_A1_PIN	(9 + MRAA_OFFSET)
#define MOTOR_A2_PIN	(10 + MRAA_OFFSET)
#define MOTOR_B1_PIN	(11 + MRAA_OFFSET)
#define MOTOR_B2_PIN	(12 + MRAA_OFFSET)
#else
#if GALILEO == 1
/* Production machine using Galileo */
#define MRAA_OFFSET	0
#define TEMP_SENSOR_PIN (0 + MRAA_OFFSET)
#define RED_LED_PIN	(2 + MRAA_OFFSET)
#define GREEN_LED_PIN	(3 + MRAA_OFFSET)
#define MOTOR_SENSE1_PIN (4 + MRAA_OFFSET)
#define MOTOR_SENSE2_PIN (5 + MRAA_OFFSET)
#define MOTOR_SENSE3_PIN (6 + MRAA_OFFSET)
#define TRAY_SENSE_PIN	(7 + MRAA_OFFSET)
#define MOTOR_STEP_PIN	(9 + MRAA_OFFSET)
#define MOTOR_ENA1_PIN	(10 + MRAA_OFFSET)
#define MOTOR_ENA2_PIN	(11 + MRAA_OFFSET)
#define MOTOR_ENA3_PIN	(12 + MRAA_OFFSET)
#define MOTOR_DIR_PIN	(13 + MRAA_OFFSET)
#else
/* Production machine using Dell + FT4222H + PCA9555 */
#define MRAA_OFFSET	512			/* FT4222H offset */
#define MOTOR_STEP_PIN	(2 + MRAA_OFFSET)	/* FT4222H GPIO2 */
#define MOTOR_DIR_PIN	(3 + MRAA_OFFSET)	/* FT4222H GPIO3 */
#define MOTOR_SENSE1_PIN (4 + MRAA_OFFSET)	/* PCA9555 pin 0.0 */
#define MOTOR_SENSE2_PIN (5 + MRAA_OFFSET)	/* PCA9555 pin 0.1 */
#define MOTOR_SENSE3_PIN (6 + MRAA_OFFSET)	/* PCA9555 pin 0.2 */
#define TRAY_SENSE_PIN	(7 + MRAA_OFFSET)	/* PCA9555 pin 0.3 */
#define MOTOR_ENA1_PIN	(12 + MRAA_OFFSET)	/* PCA9555 pin 1.0 */
#define MOTOR_ENA2_PIN	(13 + MRAA_OFFSET)	/* PCA9555 pin 1.1 */
#define MOTOR_ENA3_PIN	(14 + MRAA_OFFSET)	/* PCA9555 pin 1.2 */
#define RED_LED_PIN	(15 + MRAA_OFFSET)	/* PCA9555 pin 1.3 */
#define GREEN_LED_PIN	(16 + MRAA_OFFSET)	/* PCA9555 pin 1.4 */
#endif
#endif

/*
 * NUM_MOTORS - number of motors
 */
#define NUM_MOTORS 3

/*
 * Low and high temperature thresholds in degrees Celsius
 */
#define TEMPERATURE_RANGE_MIN_VAL 19
#define TEMPERATURE_RANGE_MAX_VAL 30

/*
 * Database files
 */
const char *events_file;

/*
 * Stores and manipulate dispense events
 */
class DispenseEvent {
	unsigned int tray;
	uint64_t timestamp;
public:
	DispenseEvent(uint64_t timestamp, unsigned int tray);
	uint64_t get_timestamp();
	unsigned int get_tray();
	void dispensed(int result);
};

DispenseEvent::DispenseEvent(uint64_t tm, unsigned int tr)
{
	timestamp = tm;
	tray = tr;
}

uint64_t DispenseEvent::get_timestamp()
{
	return timestamp;
}

unsigned int DispenseEvent::get_tray()
{
	return tray;
}

void DispenseEvent::dispensed(int result)
{
	sqlite3 *db;
	char *sql_error = NULL;
	int rc;
	char buffer[256];

	rc = sqlite3_open(events_file, &db);

	if (rc) {
		std::cerr << "Error opening database: " << sqlite3_errmsg(db) << std::endl;
		return;
	}

	if (0 == result) {
		std::cout << "Updating dispense event, marking as dispensed: timestamp: " << timestamp << "; tray: " << tray << std::endl;
		sprintf(buffer, "UPDATE events SET status=\"dispensed\" WHERE timestamp=%lu AND type='dispense' AND description='tray%u' AND status='pending'", timestamp, tray);
	} else {
		std::cout << "Updating dispense event, marking as error: timestamp: " << timestamp << "; tray: " << tray << std::endl;
		sprintf(buffer, "UPDATE events SET status=\"error\" WHERE timestamp=%lu AND type='dispense' AND description='tray%u' AND status='pending'", timestamp, tray);
	}
	std::cout << "SQL query: " << buffer << std::endl;
	rc = sqlite3_exec(db, buffer, NULL, NULL, &sql_error);

	if (rc) {
		std::cerr << "Error executing SQL statement: " << sql_error << std::endl;
		return;
	}

	sqlite3_close(db);
}

/*
 * Add a dispense events
 */
void add_dispense_events(std::vector<DispenseEvent> & dispense_events, uint64_t timestamp, unsigned int tray)
{
	int found = 0;
	for (unsigned int i = 0; i < dispense_events.size(); i++) {
		if (dispense_events[i].get_timestamp() == timestamp) {
			found = 1;
		}
	}
	if (!found) {
		std::cout << "Adding dispense event: timestamp: " << timestamp << "; tray: " << tray << std::endl;
		dispense_events.push_back(DispenseEvent(timestamp, tray));
	}
}

/*
 * Report an event into SQLite database
 */
void db_report_event(const char *type, const char *description, int value, const char *status)
{
	sqlite3 *db;
	sqlite3_stmt *stmt;
	struct timeval tv;
	int rc;
	uint64_t timestamp;

	// get UNIX time in milliseconds
	gettimeofday(&tv, NULL);
	timestamp = (uint64_t)(tv.tv_sec) * 1000 + (uint64_t)(tv.tv_usec) / 1000;

	rc = sqlite3_open(events_file, &db);

	if (rc) {
		std::cerr << "Error opening database: " << sqlite3_errmsg(db) << std::endl;
		return;
	}
	std::cout << "Reporting event: timestamp=" << timestamp <<"; type=" << type << "; description=" << description << "; value=" << value  << "; status=" << status << std::endl;
    rc = sqlite3_prepare_v2(db, "INSERT INTO events (timestamp, type, description, value, status) VALUES (?1,?2,?3,?4,?5)",
				-1, &stmt, NULL);
	sqlite3_bind_int64(stmt, 1, timestamp);
	sqlite3_bind_text(stmt, 2, type, -1, SQLITE_STATIC);
	sqlite3_bind_text(stmt, 3, description, -1, SQLITE_STATIC);
	sqlite3_bind_int(stmt, 4, value);
	sqlite3_bind_text(stmt, 5, status, -1, SQLITE_STATIC);

	if (rc) {
		std::cerr << "Error compiling SQL statement: " << sqlite3_errmsg(db) << std::endl;
		return;
	}

	rc = sqlite3_step(stmt);

	if (rc != SQLITE_DONE) {
		std::cerr << "SQL Error: " << sqlite3_errmsg(db) << std::endl;
	}

	sqlite3_finalize(stmt);
	sqlite3_close(db);
}

/*
 * Read products information from SQLite database and update dispense_events
 * vector accordingly
 */
void db_get_dispence_events(std::vector<DispenseEvent> & dispense_events)
{
	sqlite3 *db;
	sqlite3_stmt *stmt;
	int rc;

	rc = sqlite3_open(events_file, &db);

	if (rc) {
		std::cerr << "Error opening database: " << sqlite3_errmsg(db) << std::endl;
		return;
	}

	rc = sqlite3_prepare_v2(db, "SELECT timestamp,description FROM events WHERE type=\"dispense\" AND status=\"pending\"",
				-1, &stmt, NULL);

	if (rc) {
		std::cerr << "Error compiling SQL statement: " << sqlite3_errmsg(db) << std::endl;
		return;
	}

	while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
		unsigned int tray = 0;
		if (!strcmp((char *) sqlite3_column_text(stmt, 1), "tray1")) {
			tray = 1;
		} else if (!strcmp((char *) sqlite3_column_text(stmt, 1), "tray2")) {
			tray = 2;
		} else if (!strcmp((char *) sqlite3_column_text(stmt, 1), "tray3")) {
			tray = 3;
		}
		add_dispense_events(dispense_events, sqlite3_column_int64(stmt, 0), tray);
	}

	if (rc != SQLITE_DONE) {
		std::cerr << "SQL Error: " << sqlite3_errmsg(db) << std::endl;
	}

	sqlite3_finalize(stmt);
	sqlite3_close(db);
}

/*
 * Monitor the machine for failures:
 * - Check if machine was opened or closed and send an event.
 * - Read temperature sensor. Compare temperature with thresholds.
 *   Send an event in case the temperature is too high, too low, or back to normal
 */
int monitor_machine(
		mraa::Gpio* machine_open_sensor, int temperature,
		upm::GroveLed *red_led, upm::GroveLed *green_led, upm::Jhd1313m1 *lcd
) {
	// failure state flags
	static int machine_open_flag = 0, temp_high_flag = 0, temp_low_flag = 0;
	// report temperature flag
	int report_temp_flag = 0;
	static time_t last_temp_report = 0;	
	// result
	int failure = 0;
	// LCD variables
	int row = 0;
	char buffer[20];

	// clear the LCD
	lcd->clear();

	// check for too low or too high temperature
	if (temperature < TEMPERATURE_RANGE_MIN_VAL) {
		// temperature too low
		if (!temp_low_flag) {
			// set flag and report low temperature
			temp_low_flag = 1;
			report_temp_flag = 1;
		}
		// reset high flag
		temp_high_flag = 0;
		lcd->setCursor(row++, 0);
		sprintf(buffer, "t=%dC too low", temperature);
		lcd->write(buffer);
	} else if (temperature > TEMPERATURE_RANGE_MAX_VAL) {
		// temperature too high
		if (!temp_high_flag) {
			// set flag and report high temperature
			temp_high_flag = 1;
			report_temp_flag = 1;
		}
		// reset low flag
		temp_low_flag = 0;
		lcd->setCursor(row++, 0);
		sprintf(buffer, "t=%dC too high", temperature);
		lcd->write(buffer);
	} else if (temperature > TEMPERATURE_RANGE_MIN_VAL && temperature < TEMPERATURE_RANGE_MAX_VAL){
		// temperature is back to normal range (note there is 1 degrees threshold)
		if (temp_high_flag || temp_low_flag) {
			report_temp_flag = 1;
		}
		// reset temperature flags
		temp_low_flag = 0;
		temp_high_flag = 0;
	}

	// send the temperature if 60 or more seconds had passed since the last report
	if (time(NULL) >= last_temp_report + 60) {
		report_temp_flag = 1;
	}

	if (report_temp_flag) {
		last_temp_report = time(NULL);
		if (temp_low_flag) {
			// report low temperature
			db_report_event("temperature", "low", temperature, "error");
		} else if (temp_high_flag) {
			// report high temperature
			db_report_event("temperature", "high", temperature, "error");
		} else {
			// report normal temperature
			db_report_event("temperature", "normal", temperature, "ok");
		}
	}

	// check if machine is opened
	if (machine_open_sensor->read() == 1) {
		// toggle fail flag
		if (!machine_open_flag) {
			machine_open_flag = 1;
			db_report_event("failure", "machine_opened", 0, "error");
		}
		lcd->setCursor(row++, 0);
		lcd->write("Machine opened");
	} else {
		if (machine_open_flag) {
			machine_open_flag = 0;
			db_report_event("failure", "machine_closed", 0, "ok");
		}
	}
	if (machine_open_flag || temp_low_flag || temp_high_flag) {
		green_led->off();
		red_led->on();
		lcd->setColor(255, 0, 0);
		failure = 1;
	} else {
		green_led->on();
		red_led->off();
		lcd->setColor(0, 255, 0);
		lcd->setCursor(row++, 0);
		lcd->write("Machine is ready");
	}
	return failure;
}

#if PROTOTYPE != 1
int reset_motor(
                upm::StepMotor* motor,
                mraa::Gpio* motor_enable,
                mraa::Gpio* motor_sense);
#endif

#if PROTOTYPE == 1
/*
 * Dispense a product by rotating stepper motor.
 */
int dispense_product(
		upm::ULN200XA* motor,
		mraa::Gpio* motor_sense,
		upm::Jhd1313m1* lcd,
		int tray_number)
{
	// dispense the product
	lcd->clear();
	lcd->setCursor(0, 0);
	lcd->write("Dispensing your");
	lcd->setCursor(1, 4);
	lcd->write("product");
	// set motor speed
	motor->setSpeed(5);
	if (1 == tray_number) {
		motor->setDirection(upm::ULN200XA::DIR_CW);
	} else if (2 == tray_number) {
		motor->setDirection(upm::ULN200XA::DIR_CCW);
	}
	motor->stepperSteps(4096);
	// turn off the power
	motor->release();
	// check that the motor is at the inital position again
	if (motor_sense->read() != 0) {
		std::cerr << "Motor did not return to the initial position. Error dispensing item." << std::endl;
		return 1;
	}

	return 0;
}

#else

/*
 * Dispense a product by rotating stepper motor.
 */
int dispense_product_stepper(
		upm::StepMotor* motor,
		mraa::Gpio* motor_enable[],
		mraa::Gpio* motor_sense[],
		upm::Jhd1313m1* lcd,
		int tray_number)
{
	int steps;
	int error = 0;
	if (tray_number < 1 || tray_number > NUM_MOTORS) {
		std::cerr << "Invalid tray number: " << tray_number << std::endl;
		return 1;
	}

	int motor_num = tray_number - 1;

	// dispense the product
	lcd->clear();
	lcd->setCursor(0, 0);
	lcd->write("Dispensing your");
	lcd->setCursor(1, 4);
	lcd->write("product");
	// make sure that the motor is at the initial position
	if (motor_sense[motor_num]->read() != 0) {
		if(reset_motor(motor, motor_enable[motor_num], motor_sense[motor_num])) {
			std::cerr << "Unable to reset motor. Error dispensing item." << std::endl;
			return 1;
		}
	}
	// set motor speed
	motor->setSpeed(300);
	// enable motor
	motor_enable[motor_num]->write(0);
	// motor has 200 steps per revolution
	// gear ratio is 1:3 (20:60)
	// QuadStep/A4983 motor driver is configured for full step resolution
	// 200 * 3 = 600
	motor->stepBackward(600);
	// check that motor had returned to the initial position
	//if not turn it a bit more - 30 degrees / 3 degrees at each iteration
	for (steps = 0; steps < 50; steps += 5) {
		if (motor_sense[motor_num]->read() == 0) break;
		motor->stepBackward(5);
	}

	// check that the motor has returned to the inital position
	if (steps >= 50) {
		std::cerr << "Motor did not return to the initial position. Error dispensing item." << std::endl;
		error = 1;
	}
	// disable motor
	motor_enable[motor_num]->write(1);

	return error;
}
#endif

#if PROTOTYPE != 1
int reset_motor(
		upm::StepMotor* motor,
		mraa::Gpio* motor_enable,
		mraa::Gpio* motor_sense)
{
	int steps;
	int error = 0;

	// set motor speed
	motor->setSpeed(300);

	// enable_motor
	motor_enable->write(0);

	// turn 3 degrees at each iteration
	for (steps = 0; steps < 600; steps += 5) {
		if (motor_sense->read() == 0) break;
		motor->stepBackward(5);
	}

	if (steps >= 600) {
		error = 1;
	}

	// disable_motor
	motor_enable->write(1);

	return error;
}
#endif


/*
 * main
 */
int main(int argc, char *argv[])
{
	// vector with dispense events
	std::vector<DispenseEvent> dispense_events;

	mraa::Result response;

	// check command line arguments
	if (argc != 2) {
		std::cerr << "Usage: " << argv[0] <<
			" <sqlite3_events_file> " << std::endl;
		exit(1);
	}
	events_file = argv[1];

#if GALILEO == 1
	// check that we are running on Galileo
	mraa_platform_t platform = mraa_get_platform_type();
	if ((platform != MRAA_INTEL_GALILEO_GEN1) &&
			(platform != MRAA_INTEL_GALILEO_GEN2)) {
		std::cerr << "Unsupported platform, exiting" << std::endl;
		return MRAA_ERROR_INVALID_PLATFORM;
	}
#endif

#if PROTOTYPE == 1
	// temperature sensor connected to A0 (analog in)
	upm::GroveTemp* temp_sensor = new upm::GroveTemp(TEMP_SENSOR_PIN);

	// Grove kit stepper motor
	upm::ULN200XA* motor = new upm::ULN200XA(4096,
			MOTOR_A1_PIN, MOTOR_A2_PIN,
			MOTOR_B1_PIN, MOTOR_B2_PIN);

	mraa::Gpio* motor_sense = new mraa::Gpio(MOTOR_SENSE_PIN);
	if (motor_sense == NULL) {
		return mraa::ERROR_UNSPECIFIED;
	}
	response = motor_sense->dir(mraa::DIR_IN);
	if (response != mraa::SUCCESS) {
		mraa::printError(response);
		return 1;
	}
#else
	// AM2315 temperature sensor
	std::cout << "Initializing temperature sensor" << std::endl;
	upm::AM2315 *temp_sensor = new upm::AM2315(MRAA_OFFSET);
	temp_sensor->testSensor();
	std::cout << "Temperature: " << temp_sensor->getTemperature() << std::endl;

	// Quadstepper Motor Driver + sense switches 
	mraa::Gpio* motor_enable[NUM_MOTORS];
	mraa::Gpio* motor_sense[NUM_MOTORS];
	int motor_enable_gpios[] = {
			MOTOR_ENA1_PIN,
			MOTOR_ENA2_PIN,
			MOTOR_ENA3_PIN
	};
	int motor_sense_gpios[] = {
			MOTOR_SENSE1_PIN,
			MOTOR_SENSE2_PIN,
			MOTOR_SENSE3_PIN
	};
	for (int i = 0; i < NUM_MOTORS; i++) {
		// configure motor enable GPIO
		motor_enable[i] = new mraa::Gpio(motor_enable_gpios[i]);
		if (motor_enable[i] == NULL) {
			return mraa::ERROR_UNSPECIFIED;
		}
		response = motor_enable[i]->dir(mraa::DIR_OUT);
		if (response != mraa::SUCCESS) {
			mraa::printError(response);
			return 1;
		}
		// disable motor by default
		response = motor_enable[i]->write(1);

		// configure motor sense GPIO
		motor_sense[i] = new mraa::Gpio(motor_sense_gpios[i]);
		if (motor_sense[i] == NULL) {
			return mraa::ERROR_UNSPECIFIED;
		}
		response = motor_sense[i]->dir(mraa::DIR_IN);
		if (response != mraa::SUCCESS) {
			mraa::printError(response);
			return 1;
		}
#if GALILEO == 1
		response = motor_sense[i]->mode(mraa::MODE_PULLUP);
		if (response != mraa::SUCCESS) {
			mraa::printError(response);
			return 1;
		}
#endif
	}
	upm::StepMotor* motor = new upm::StepMotor(
			MOTOR_DIR_PIN, MOTOR_STEP_PIN, 200);
#endif

	// machine open sensor connected to D7 (digital in)
	mraa::Gpio* machine_open_sensor = new mraa::Gpio(TRAY_SENSE_PIN);
	if (machine_open_sensor == NULL) {
		return mraa::ERROR_UNSPECIFIED;
	}
	response = machine_open_sensor->dir(mraa::DIR_IN);
	if (response != mraa::SUCCESS) {
		mraa::printError(response);
		return 1;
	}
	// Grove Button is used in prototype
	// it has a built-in pull-down resistor
#if PROTOTYPE == 0 && GALILEO == 1
	response = machine_open_sensor->mode(mraa::MODE_PULLUP);
	if (response != mraa::SUCCESS) {
		mraa::printError(response);
		return 1;
	}
#endif

	// red led connected to D2 (digital out)
	upm::GroveLed* red_led = new upm::GroveLed(RED_LED_PIN);

	// green led connected to D3 (digital out)
	upm::GroveLed* green_led = new upm::GroveLed(GREEN_LED_PIN);
	if (NULL == green_led) {
		std::cerr << "Unable to initialize the Green LED" << std::endl;
		return MRAA_ERROR_UNSPECIFIED;
	}

	// LCD connected to the default I2C bus
	upm::Jhd1313m1* lcd = new upm::Jhd1313m1(MRAA_OFFSET);

	// check for errors
	if (motor == NULL || red_led == NULL || 
			temp_sensor == NULL || lcd == NULL) {
		std::cerr << "Unable to create all UPM objects, exiting" << std::endl;
		return MRAA_ERROR_UNSPECIFIED;
	}

#if PROTOTYPE != 1
	for (int i = 0; i < NUM_MOTORS; i++) {
		if (reset_motor(motor, motor_enable[i], motor_sense[i])) {
			std::cerr << "Error resetting motor " << i + 1 << std::endl;
		}
	}
#endif

	// loop forever
	int previous_temperature = TEMPERATURE_RANGE_MIN_VAL + 1;
	for (;;) {
		// measure temperature
#if PROTOTYPE == 1
		int temperature = temp_sensor->value();
#else
		int temperature = temp_sensor->getTemperature();
#endif
		// avoid temperature glitches
		if (temperature != 0 && temperature < 150) {
			previous_temperature = temperature;
		} else {
			temperature = previous_temperature;
		}
		// monitor the machine for failures
		monitor_machine(machine_open_sensor, temperature, red_led, green_led, lcd);
		// get dispense events from the database
		db_get_dispence_events(dispense_events);
		// check if any dispense events available
		while (dispense_events.size() > 0) {
			// process the first event from the vector
#if PROTOTYPE == 1
			int result = dispense_product(motor, motor_sense, lcd, dispense_events[0].get_tray());
#else
			int result = dispense_product_stepper(motor, motor_enable, motor_sense, lcd, dispense_events[0].get_tray());
#endif
			dispense_events[0].dispensed(result);
			dispense_events.erase(dispense_events.begin());
		}
		sleep(1);
	}

	return 0;
}
