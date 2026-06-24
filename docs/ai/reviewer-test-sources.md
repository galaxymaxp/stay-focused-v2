# Reviewer Test Sources

Canonical local sources for manual and scripted reviewer generation checks.
Use these fixtures instead of inventing one-off source text during Codex tasks.

## Fixture A - Organized Short Source, Should Pass Cleanly

Expected behavior:

- Produces a useful reviewer.
- Four sections or a clean single grouped section is acceptable depending on outline rules.
- No validation failure.
- HTTP 200 in Expo/API manual flow.

Source:

```txt
Module 1: Study Habits and Focus

1. Active Recall
Active recall is a study method where the learner tries to remember information without immediately looking at the notes. It helps strengthen memory because the brain practices retrieving the answer. Examples include answering practice questions, explaining a topic from memory, and writing down key points after reading.

2. Spaced Repetition
Spaced repetition is a review method where lessons are reviewed again after increasing time intervals. Instead of studying everything in one long session, the learner reviews the topic today, then again tomorrow, then after several days. This helps reduce forgetting and improves long-term retention.

3. Pomodoro Technique
The Pomodoro Technique is a time management method that divides study time into focused work sessions and short breaks. A common pattern is 25 minutes of focused study followed by a 5-minute break. The goal is to avoid burnout, reduce distractions, and make studying easier to start.

4. Distraction Management
Distraction management means reducing anything that interrupts focus during study time. Common distractions include phone notifications, social media, noise, and multitasking. Helpful actions include turning on Do Not Disturb, keeping the phone away, preparing materials before studying, and studying in a quiet place.
```

## Fixture B - Flattened OCR Slide Stream, Should Return 200 But Quality May Be Rough For Now

Expected behavior:

- Should not crash.
- Should not return 500.
- HTTP 200 is acceptable.
- HTTP 422 is acceptable only if validation honestly fails.
- Output may have rough sections until the OCR layout phase.
- No unsupported enrichment should be visible.

Source:

```txt
Arduino Basics Unit 2 CIT4 Introduction to Integrative Programming Table of Contents - Arduino Simulator - Programming in Arduino - Basics - Arduino Parts - Digital inputs and outputs - LED - Resistors - Breadboard - Series Circuits - Parallel Circuits Arduino Simulator TinkerCad Arduino Simulator - TinkerCad - Go to https://www.tinkercad.com/dashboard - It is a web-based open-source simulator - Contains Arduino modelling with code - Create a personal account (not student account) - In the dashboard, select circuits. - Programming in Arduino - Basics - Program: a set of instructions that tells the Arduino Board what to do - Part 1: Variable Declaration - Part 2: void setup( ) - Part 3: void loop( ) - Part 4: User-defined functions - Programming in Arduino - Basics - Variable declaration syntax: - = [ ]; - Note: <> == required; [] == optional - Example: int LED = 13; - Can be global or local fields - void setup( ) method - Must be created at the top of each program - Main purpose is to initialize and set initial values of your code for Arduino - Method body is executed one time when you start running the program - Programming in Arduino - Basics - void loop( ) method - Executed repeatedly after the setup function is finished from { to } - User-defined functions - Create user-defined functions and call the to the setup or loop functions to be executed Arduino Parts Digital Input and Output Pins Arduino Parts Digital Input and Output Pins Pins in Arduino board can be configured either be as input or output Arduino Parts Digital Input and Output Pins - Input: take, receive, acquire - Output: give, send, lose - Digital: 0/1 - 0 = 0v(voltage) / sinking = LOW - 1 = 3.3V or 5V(voltage)/ sinking = HIGH - Sinking = ability of the port to receive current. Arduino Parts Digital Input and Output Pins - Set the pin 13 to be an input/output pin using: - pinMode(13, OUTPUT); - digitalWrite(13, HIGH); Example - Please go to tinkercad and Create a personal account - Create a new circuit project. - Set up the properties of your project (name, etc.) Example - In your blank project. Find the Arduino board (Arduino Uno R3) in the components menu and drag it to the empty canvas. Example - Make sure that you've dragged the Arduino uno r3 in the blank canvas Example Built-in LED - Our objective is to make this built-in LED blink Example - Once you have dragged the Arduino board in the empty canvas. Please click on the code button and choose text instead of blocks. Example - Once that the Arduino board is dragged, it automatically gives a default code wherein, when started, the built-in LED will blink. Let's dissect the code line per line. Example - void setup() - is the method to be called once you have started running your program. - Body of setup() - everything inside will run ONLY once
```

## Fixture C - Sparse/Weak Source, Should Either Produce Minimal Reviewer Or Clear 422

Expected behavior:

- No HTTP 500.
- If the reviewer cannot be valid, return clear HTTP 422 with `reviewer_validation_failed`.
- Diagnostics should explain the weak or failing section.

Source:

```txt
Module 2: Networking

Router.
Switch.
IP address.
Subnet.
Firewall.
```

## Fixture D - Structured Lecture Source With Nested Bullets, Should Pass Cleanly

Expected behavior:

- Multiple useful sections.
- Nested bullets preserved.
- No duplicate section spam.

Source:

```txt
Module 3: Basic Cybersecurity Concepts

1. Security Goals
Cybersecurity protects systems, networks, and data from unauthorized access and damage.
- Confidentiality means only authorized users can access information.
- Integrity means information stays accurate and unchanged unless properly modified.
- Availability means systems and data are accessible when needed.

2. Common Threats
Threats are possible causes of harm to systems or data.
- Malware is harmful software.
- Phishing tricks users into giving sensitive information.
- Denial of service attacks try to make a service unavailable.

3. Basic Protection Methods
Protection methods reduce risk and help defend systems.
- Strong passwords help prevent unauthorized access.
- Updates fix known software weaknesses.
- Backups help recover data after loss or damage.
```

## Fixture E - Messy OCR But With Line Breaks, Should Pass Better Than One-Line OCR

Expected behavior:

- Better sections than Fixture B.
- Should not collapse into one `Untitled Source`.
- No unsupported enrichment.

Source:

```txt
Arduino Basics
Unit 2 CIT4
Introduction to Integrative Programming

Table of Contents
- Arduino Simulator
- Programming in Arduino - Basics
- Arduino Parts
- Digital inputs and outputs
- LED

Arduino Simulator
TinkerCad Arduino Simulator
- Go to https://www.tinkercad.com/dashboard
- It is a web-based open-source simulator
- Contains Arduino modelling with code
- Create a personal account
- In the dashboard, select circuits

Programming in Arduino - Basics
- Program: a set of instructions that tells the Arduino Board what to do
- Part 1: Variable Declaration
- Part 2: void setup()
- Part 3: void loop()
- Part 4: User-defined functions

void setup() method
- Must be created at the top of each program
- Main purpose is to initialize and set initial values of your code for Arduino
- Method body is executed one time when you start running the program

void loop() method
- Executed repeatedly after the setup function is finished

Arduino Parts Digital Input and Output Pins
- Pins in Arduino board can be configured as input or output
- Input: take, receive, acquire
- Output: give, send, lose
- Digital: 0/1
- 0 = 0v / LOW
- 1 = 3.3V or 5V / HIGH
- pinMode(13, OUTPUT);
- digitalWrite(13, HIGH);
```
