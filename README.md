# BEER PUMP SET UP INSTRUCTIONS #

This is a tutorial on how to set up the beer pump hardware and software.

## Index ##
1. Code set up
2. Hardware set up
3. Beer equipment set up
4. How to operate
5. How to integrate software into the front end and hardware into the beer font
6. Troubleshooting
7. How to contact James

##1. Code set up ##

### Code logic ###

This program is run on a node express server, which serves a web page that users interact with (on the touch screen), an admin web page (which allows the use of a manual override to all functions) and the control of the electronics that regulates the valve, monitors the volume of liquid passing through the beer font and switches the LEDs on/off.

The whole application is wrapped up inside of a gulp task management system, which creates a link that users can use to access the local host through a local network (I will go into more detail about this on the 'How to Operate' section). The flow of the application is as follows:

1. The express server is launched, the locally hosted accessible links are generated and the application begins constantly checking for the state of the liquid flow sensor pin.
2. When a user clicks on the "Pour Pint" button, this fires two web sockets, one that tells the application to open the valve and another that tells the application that it is pouring a pint. Upon receiving these sockets, the server sends a web socket back to the front end saying that the pint is being poured, then the front end responds by changing the interface.
3. As the beer is flowing, a sensor in the flow meter spins around on a 'windmill like' mechanism. As this mechanism spins around, the state of pin 2 of the Arduino goes from 1 - 0, the flow rate of the beer is calculated from the number of times the state of pin 2 **falls from 1 - 0** every 10th of a second. The ammount of beer in ml is then calculated based off of the flow rate.
4. When the "Stop Pint" button is pressed, it knows that a pint was pouring from the previous web socket message, so it sends a socket message to shut the beer valve + a socket message to state the pint has been paused and changes the interface to display "Resume Pint" + "Cancel Pint".
5. If the user presses "Resume Pint" the front end sends two socket messages to open the valve and tells the back end that the pint pouring has been resumed - the flow sensor will pick back up from where it left off.
6. If the user presses "Cancel Pint" this keeps the valve closed and all variables + functions in the backend are then reset, ready to pour a new pint.

### Downloading the code ###

Either click the download file above.

### Setup dependencies ###

![Screen Shot 2016-11-17 at 10.47.54.png](https://bitbucket.org/repo/oEGoyq/images/3034839866-Screen%20Shot%202016-11-17%20at%2010.47.54.png)

* Install the latest version of Node onto your computer, older versions may not be able to run the dependencies needed to make the application work.


![Screen Shot 2016-11-17 at 10.18.44.png](https://bitbucket.org/repo/oEGoyq/images/1490172828-Screen%20Shot%202016-11-17%20at%2010.18.44.png)

* Open Terminal from the applications folder



```
#!terminal
sudo npm install gulp -g
```


* Install Gulp globally


```
#!terminal
cd {YOUR/PATH/}
```

* Type cd into the terminal window, drag the folder that you've just downloaded into the window and press enter on your keyboard.


```
#!terminal
sudo npm install
```
* Type "sudo npm install" and press enter, this will install all necessary dependencies to run the application.



### Run the software ###

* Plug in the Arduino via the USB port (see below on how to set up the arduino's hardware)


```
#!terminal
gulp
```

* Type "gulp" into the terminal window, after a few seconds it will launch the application and open a web page. The opened web page is the touch screen interface which will need integrating with the front end, to access the admin page add the string "/admin" at the end of the url.


##2. Hardware set up ##

### The Arduino code ###
*All the logic for the Arduino's are controlled in the node application above that you just installed, the code on the Arduino's allow the javascript application to send commands through the serial ports for the Arduino's to follow.*

***As the code is already install on both of the Arduino's, you should not need to follow the below steps, but I've included them incase there is a need for a re-installation.***

* Download Arduino software from arduino.org **(DON'T USE SOFTWARE FROM ARDUINO.CC OR INSTALLATION WILL FAIL)**
* Open the files "arduinoA.ino" and "arduinoB.ino", located in the "Arduino-code" folder, in the Arduino IDE.

* Select the "Arduino Mega or Mega 2560" from the "tools>board" menu, the correct serial port under "tools>port" and click upload. Make sure that the code for "arduinoA.ino" goes onto the Arduino labelled A and vice versa.


### Electronics ###

The below diagram is the electronic schematic for how to set up Arduino A which controls the valve, water flow meter + the payment LED Strip and Arduino B which controls the LED ring for the beer mat.
![Schematic.jpg](https://bitbucket.org/repo/oEGoyq/images/2391534317-Schematic.jpg)
**Arduino A**

* The flow meter (pictured as a potentiometer) has three wires that connects to red to 5v; black to ground and yellow to pin 2.

* The valve is essentially an electro-magnet that is controlled by transistor that acts as a switch to a 12v power supply from the V-in pin on the Arduino. A resistor is used to protect the data pin from the current draw of the transistor that switches on the high voltage power supply and a diode is used to stop voltage spikes between ground and power lines that is created by switching an electro-magnet on/off.

* The LED strip is powered by the 5V 10A power supply, the data line of the strip goes into pin 7.

**Arduino B**

* The LED ring is powered by the 5V 10A power supply, the data line of the strip goes into pin 7. Make sure that the ground line is shared across both Arduino's and the power supply unit.

**IMPORTANT: **A 12v power supply is attached to Arduino A's power jack, this raw supply line comes out of the V-in pin. Do not put anything that is powered by 5 volts on this line and do not attach this 12v line to any of the other Arduino pins or the 5v power supply.

##3. Beer equipment set up ##

### Connecting up the beer keg with the font. ###

![PastedGraphic-1.jpg](https://bitbucket.org/repo/oEGoyq/images/3734832017-PastedGraphic-1.jpg)

The above image shows the order of how the beer serving equipment is set up, instructions to set this up are as below.

![beerSetup.jpg](https://bitbucket.org/repo/oEGoyq/images/1047563606-beerSetup.jpg)

1. Make sure the gas bottle is closed by turning the handle on top clockwise.
2. Connect the gas bottle with an attached regulator to the keg, via the keg coupler. This is done by screwing the keg coupler down clockwise and then pressing the handle down to secure it firmly onto the keg.
3. Attach the beer line from the keg to interface with the cooler on the far left tube on the back of the cooler.
4. Link the beer line from the cooler (which is located 2nd from the far right on the back of the cooler), to the connector on the beer font and the set up is now complete.

### Interfacing the electronic hardware with the beer font ###

![beertap.jpeg](https://bitbucket.org/repo/oEGoyq/images/3161374165-beertap.jpeg)

The above sketch shows the location of where the electronic hardware interfaces with the beer serving equipment.

* The liquid flow meter and electronic valve are attached to the beer line in between the cooler and the beer font.
* The liquid flow meter must be placed before before the valve, to help prevent dripping of left over beer that is left between the valve and beer font nozzle when a pint has finished pouring.

### How to serve beer through the font ###

![beerPour.jpg](https://bitbucket.org/repo/oEGoyq/images/1444141787-beerPour.jpg)

1. Make sure the cooler is filled with water, if it is not then pour water through the hole on the top and make sure there is an empty bowl underneath the black pipe located at the back of the cooler. Plug the power supply of the cooler into the wall to switch it on, the cooler will start making a fan sound and water will start to slowly trickle (periodically) from the black pipe.
2. Turn the handle of the gas bottle anti-clockwise to allow gas to pressurise the beer keg.
3. Turn the connector with the green label (located between the cooler and the beer font) anti-clock wise to open the line and allow beer to go to the beer font. This green labelled connector acts as a tap, it is **important to close this tap by turning the connector clockwise** if you want to open any of the beer lines for whatever reason, **if you don't then beer will pour out**.
4. If the electronic valve is not connected to the beer line, then you could now use the tap on the beer font to pour beer! Please see the 'How to operate' section to make beer pour out of the font.

### How to turn the beer serving equipment off ###
1. Unplug the cooler.
2. Turn the gas bottle's handle clockwise to close the gas supply off to the beer keg.
3. Turn the green handle attached to the cooler completely clockwise, to close the beer's supply to the beer font.

##4. How to operate ##

### Link the touch screen to the local host ###
1. Make sure the iPod touch, the Mac Mini and any mobile device that you want connected to the admin page are all connected to the same wifi network. If there is not a wifi network to connect to, then create a local wireless network on the Mac Mini in the system settings and connect to that network on the iPod touch + admin mobile device.
2. Follow the steps in section 1 to open the software in terminal using the command "gulp". Once the software has been launched, a web browser will automatically be opened with the locally hosted web page. To open this page on the iPod touch, close the web page, go the the terminal window and find the link under "Access Urls" that appears next to "External:". The link should be something like: http://192.168.0.57:4000, remember this url for the next step.
3. On the iPod touch, type in the url to safari and press enter - the web page should now be displayed on the iPod touch.
4. Interacting with the interface will pour/pause/stop the beer flow from the tap.

### Accessing the admin page ###

1. To access the admin page, open the same url on the admin mobile device - but add the string "/admin" at the end (this will look something like: http://192.168.0.57:4000/admin).
2. The admin page has over-ride commands to control the beer fonts valve and LEDs, these can be used by touch the buttons on the interface.

** Notes **

As well as the override commands, there is a "Clean Out Pipes" function that pours 100ml of beer, this should be used when the beer pump has not been used for an hour or so - to help prevent foam.

## How to integrate software and hardware ##

Making changes to the code is made very simple, as gulp has been configured to auto refresh the server and re-serve the html/css/js files every time a change has been made. Prior to making any changes, please make sure that gulp is running by following the steps in section 1 of this tutorial.

### Front End ###

** How to edit the front end code **

1. Make html changes to the touch screen on 'index.html' in the "Node-Server/app" directory.

2. Make html changes to the admin page on 'admin.html' in the "Node-Server/app" directory.

3. Make css changes to 'styles.scss' in the "Node-Server/app/scss" directory. Every time a change is saved, this will be automatically update "styles.css" located in the "Node-Server/app/css" directory (make sure that gulp is running whilst you make changes).

4. Make javascript changes to "script.js", located in the "Node-Server/app/js" directory.

5. All the sockets on the admin page control communicate with the back end to control the electronics, when building the interface on the touch screen, use these web sockets to control the electronics.

6. The sockets have been coded to mimic how the final app will be put together, do not try to fire more than one of the sockets attached to the buttons at the same time as this might confuse the node app controlling the electronics.

### Which sockets to integrate into the front end ###

![adminSocketsToUse.jpg](https://bitbucket.org/repo/oEGoyq/images/3494045358-adminSocketsToUse.jpg)

The only sockets that should be included in the front end for the touch screen are the 4 circled in the above image from the admin page, and they should only be called in the user journey as numbered (call the socket attached to the "Payment blink" button when a payment is required, then call the socket attached to the "Beer mat blink" button when the user needs to put their beer on the mat, etc).


** How to edit the back end code **

Open the "index.js" file located in the "Node-Server" directory.

** How to put code onto a publicly accessible server **

This is not necessary for the project, but if we wanted to do this we would need to run this application on a server that could support node. This would be something that Ben could help with.

### Integrate hardware into the beer font ###

** Beer Line **

Remove the beer line that is attached to the nozzle in the test unit, and put it into the nozzle on the new beer font.

** LEDs **

There should be two slots inside of the font which will have space for both the LED strip and LED circle. Once the font has been produced, you will need to place the LED circle into its slot for the beer mat and see how many LEDs within the strip will fit for the payment lighting.

##6. Troubleshooting ##

### Beer equipment ###

** Too much foam per pint **

The green labelled connector which is attached to a pipe, located at the back of the cooler is a valve. By turning the connector clockwise slowly, this will slightly close the valve, reduce the speed of the beer pouring from the font and therefore help reduce the foam.

** Foam sputtering out of nozzle **

This is because the keg is empty, replace the keg to resolve this issue

**  Beer tap not pouring beer **

When the handle for the beer tap is opened, this will not make beer pour as there is an electronic valve stopping the liquid in the beer line. To pour beer, click on the "Pour Pint" button on the touch screen.

** Pour Pint button is not pouring a pint **

If clicking on the "Pour Pint" button is not pouring a pint, then check if the page has fully loaded. If it is not, then this means that the sockets have not been initiated and back end will not be receiving any socket messages to activate the valve. Refresh the web page manually to resolve this.

** Web sockets are working, but beer is still not pouring **

If web sockets are working correctly then check if the green labelled connector which located at the back of the cooler is open, by turning the connector anti-clockwise.

** How to remove and replace a keg **

1. Turn the handle on the gas canister clockwise to close off the gas supply.

2. Turn the green labelled connector attached to the cooler clockwise to close the valve.

3. Lift the handle of the keg coupler up and turn it anti-clockwise to detach it from the keg (expect a little bit of compressed gas to escape). Put the keg coupler onto the new keg and turn it clockwise to attach it onto the keg, press handle of the coupler down to fix it to the keg.

4.Turn the gas canister handle + green labelled cooler connector anti clockwise and the beer can now be poured from the new keg.

** How to detach the beer line pipes **

1. Push the pipe into the pipe connector
2. Push the dark grey ring down into the connector
3. Pull the pipe out of the connector whilst pushing the dark grey ring down.

** How to replace a gas canister **

1. Turn the handle on the gas canister clockwise as tightly as possible to completely close off the gas supply.
2. Turn the cog shaped handle which connects the gas supply to the gas regulator anti-clockwise to detach it from the gas canister.
3. Place the cog shaped handle back onto the gas canister and turn it clock wise to close it.
4. Open the gas canister's valve by turning it anti-clock wise and the gas canister should now be working correctly.

### Code ###

** Terminal error when I try to pour a pint **

If terminal displays an error like: "TypeError: Cannot read property 'write' of undefined", then this means that the Arduino is not plugged in, plug the Arduino into the computer USB and this will resolve the issue.

** Web page not refreshing when restart the node server **

Sometimes when the node server is restarted, the web page does not auto-refresh properly - in this scenario you will need to press the refresh button.

** I want to run the application without gulp **

In terminal navigate to "Node-Server" directory and then type "node index.js". This will launch a local server which you can access by typing "http://localhost:3000" into your browser url bar.
