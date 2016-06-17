CONTENTS OF THIS FILE
---------------------
   
 * Introduction
 * Requirements
 * Recommended modules
 * Installation
 * Activation
 * Configuration
 * Troubleshooting
 * FAQ
 * Maintainers


INTRODUCTION
------------

This package includes code for both Admin and Mobile versions of the Intel Smart Home demo project. The Node/Express server is set up based on a slightly modified version of http://start.jcolemorrison.com/building-an-angular-and-express-app-part-1/.


REQUIREMENTS
------------

This module requires the following modules:

 * Nodejs 
 		* Downloadable (https://nodejs.org/)
 		* Command Line: (may need "sudo")
 			* ($ curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash - )
 			* ($ apt-get install -y nodejs )
 			* ($ sudo apt-get install -y build-essential )
 * Express Server ($ npm install -g express)
 * Nodemon ($ npm install -g nodemon)
 * Bower 
 		* ($ npm install -g bower)
 		* ($ bower install)
 * Grunt 
 		* ($ npm install grunt)
 		* ($ npm install)
 * Ruby 
 		* ($ gem update --system)
 		* ($ gem install compass)

 * See package.json file for required module dependencies. All required dependencies are included.
 

RECOMMENDED MODULES
-------------------

 * There are no recommended modules.


INSTALLATION
------------
 
 * Unzip "ivm-client-server.zip" to your project folder. There will be a "client" and "server" folder. 

 * Source files are in the "client" folder. To run the project in the local development env, Terminal to the "client" directory and do a ( $ grunt serve ). You can now view the project at http://0.0.0.0:9000/.

 * Alternatively, to run the project via the Express server, but using the files in the "client" directory, Terminal to the "server" directory and do a ( $ npm test ). You can now view the project at http://0.0.0.0:3000/.

 * When a deployment distrobution copy is required, Terminal to the "client" directory and do a ( $ grunt --force ). This will build the project into the "server" directory. Then Terminal to the "server" directory and do a ( $ npm start ). You can now view the distrobution version of the project at http://0.0.0.0:3000/.


ACTIVATION
------------
 
 * Terminal line to the /server/ directory. Type the command ( $ npm start ). 

 * Admin View: This view is ONLY available at screen width 1024px and greater. The access url is http://0.0.0.0:3000/#/admin

 * Mobile View: This view is ONLY available at screen width 435px and smaller. The access url is url http://0.0.0.0:3000/#/mobile


CONFIGURATION
-------------

This project has no configurable option.


TROUBLESHOOTING
---------------

 * 

FAQ
---

Q: 

A: 


MAINTAINERS
-----------

Current maintainers:
 * Cesar M. Villaca II (cesar@empiricalux.com)

This project has been developed by:
 * Empirical UX
   Visit https://www.empiricalux.com for more information.


  