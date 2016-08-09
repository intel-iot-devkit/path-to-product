CC=g++
LOCAL_CFLAGS=$(CFLAGS) -c -Wall
LOCAL_LDFLAGS=$(LDFLAGS) -lsqlite3 -lmraa -lupm-grove -lupm-stepmotor -lupm-i2clcd -lupm-uln200xa -lupm-am2315
SOURCES=control_app.cpp
OBJECTS=$(SOURCES:.cpp=.o)
EXECUTABLE=control_app

all: $(SOURCES) $(EXECUTABLE)	

$(EXECUTABLE): $(OBJECTS)
	$(CC) $(LOCAL_LDFLAGS) $(OBJECTS) -o $@

.cpp.o:
	$(CC) $(LOCAL_CFLAGS) $< -o $@

clean:
	rm $(EXECUTABLE) $(OBJECTS)
