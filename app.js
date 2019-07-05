/**
 * Copyright 2019, McDuck Labs
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// [START gae_node_request_example]
const express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');

const app = express();
var path = require('path');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })  


app.use('/public', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    key: 'mcduck_bank',
    secret: 'ikn0wsom3th1ngy0ud0ntkn0w',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));
// This middleware will check if user's cookie is still saved in browser and user is not set, 
// then automatically log the user out.
// This usually happens when you stop your express server after login, 
// your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.mcduck_bank && !req.session.user) {
        res.clearCookie('mcduck_bank');        
    }
    next();
});

// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    console.log("sessionChecker(): Checking cookies: " + JSON.stringify(req.cookies));
    if (req.session.user && req.cookies.mcduck_bank) {
        console.log("sessionChecker(): " + JSON.stringify(req.session.user));
        res.redirect('/account');
    } else {
        console.log("sessionChecker(): NOT!");
        res.sendFile(path.join(__dirname + '/public/login.html'));

        //        next();
    }    
};

var db = require("./db.js");

//-------------------------------------------------------------------

app.get('/', sessionChecker, (req, res) => {
    res.sendFile(path.join(__dirname + '/public/login.html'));
});

// route for user logout
app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.mcduck_bank) {
        res.clearCookie('mcduck_bank');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

/*
// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
});
*/

app.get('/transactiontypes', (req,res) => {

    // check for API auth

    console.log("/transactiontypes GET START");

    res.setHeader('Content-Type', 'application/json');

    var type = "[{ \"id\": 0,\"name\": \"Deposit\" },{\"id\": 1, \"name\": \"Withdrawl\"}]";

    res.json(type);
    
/*
    db.getTransactionTypes( function(result) {

        res.setHeader('Content-Type', 'application/json');
        res.end(result);
    
    });
    */
});
app.get('/getaccounts', (req,res) => {
    // TODO check for API auth
    console.log("/accounttypes GET START");

    res.setHeader('Content-Type', 'application/json');

    var type = "[{ \"account\": 1,\"name\": \"McDuck\" },{\"id\": 2, \"name\": \"Pokey\"}]";

    res.json(type);
    
/*
    db.getTransactionTypes( function(result) {

        res.setHeader('Content-Type', 'application/json');
        res.end(result);
    
    });
    */
});

app.get('/fakelogin0', (req,res) => {
    console.log("Creating a fake session for UID 0");
    var userSession = "{\"id\": 0, \"name\":\"Admin\" }";
    req.session.user = JSON.parse(userSession);
    res.redirect("/");

});

app.post('/login', urlencodedParser, function(req,res) {
    console.log("/login: POST START");
    console.dir(req.body);
    var account = req.body.inputAccount;
    var pin = req.body.inputPIN;
    console.log("User name = "+ account +", password is "+ pin);

    db.validateLogin(account, pin, function (result) {

        if ( result == false ) {
            res.status(200).send('LOGIN FAILED');
        }
        else {
            res.redirect("/");
        }
    });   
});

app.post('/postTransaction', urlencodedParser, function(req,res) {
    //bearer check
    console.log("/postTransaction: POST START");
    console.dir(req.body);
    var account = req.body.account;
    var transaction = req.body.transaction;
    var amount = req.body.amount;
    
    console.log("Account = "+ account +", transaction="+ transaction + " amount=" + amount );
});

app.get('/admin', sessionChecker, function(req, res) {
/*    
    if (req.session.user && req.cookies.mcduck_bank) {
        res.sendFile(__dirname + '/public/dashboard.html');
    } else {
        res.redirect('/login');
    }
*/
    res.sendFile(path.join(__dirname + '/secure/admin.html'));
});

app.get('/account', function(req, res) {
    //check for login
    res.sendFile(path.join(__dirname + '/secure/account.html'));

});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});


// [END gae_node_request_example]