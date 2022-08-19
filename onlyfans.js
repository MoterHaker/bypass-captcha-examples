/**
 This script demonstrates automated signin into Onlyfans account.
 Replace constants "anticaptchaAPIKey", "login" and "password" with your own values.

 You may need to run the script several times due to incorrect Recaptcha score.

 */
const anticaptcha = require("@antiadmin/anticaptchaofficial");
const pup = require("puppeteer");
const axios = require('axios')

//API key for anti-captcha.com
const anticaptchaAPIKey = 'YOUR_API_KEY_HERE';

//login and password for Onlyfans
const login = 'some@email.com';
const password = 'your_password_here';

const url = 'https://onlyfans.com/';
const sitekeyV3 = '6LcvNcwdAAAAAMWAuNRXH74u3QePsEzTm6GEjx0J';
const sitekeyV2 = '6LddGoYgAAAAAHD275rVBjuOYXiofr1u4pFS5lHn';

let browser = null;
let page = null;
let tokenV2 = null;
let tokenV3 = null;

let encodedPassword = null;


(async () => {

    anticaptcha.setAPIKey(anticaptchaAPIKey);
    const balance = await anticaptcha.getBalance();
    if (balance <= 0) {
        console.log('Buy your anticaptcha balance!');
        return;
    } else {
        console.log('API key balance is '+balance+', continuing');
        // anticaptcha.shutUp(); //uncomment for silent captcha recognition
    }

    try {
        console.log('opening browser ..');


        let options = {
            headless: false,
            ignoreHTTPSErrors: true,
            devtools: true,
            args: [
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        };
        console.log(options);
        browser = await pup.launch(options);


        console.log('creating new page ..');
        page = await browser.newPage();
    } catch (e) {
        failCallback("could not open browser: "+e);
        return false;
    }


    page.on('console', msg => console.log('EVAL LOG:', msg.text()));

    await page.setRequestInterception(true);
    page.on('request', (request) => {
        //abort to replace with out version of this file
        if (request.url().indexOf('users/login') !== -1) {
            console.log('aborting '+request.url());

            encodedPassword = JSON.parse(request.postData())["encodedPassword"];

            //extracting headers
            const headers = request.headers();
            const extractedHeaders = {};
            for (const index in headers) {
                if (['app-token', 'x-bc', 'sign', 'time'].indexOf(index) !== -1) {
                    extractedHeaders[index] = headers[index];
                }
            }

            console.log('extracted headers:')
            console.log(extractedHeaders);

            request.abort();
            solveRecaptchaAndLogin(extractedHeaders);
        } else {
            request.continue();
        }
    });


    console.log("going to "+url);
    try {
        await page.goto(url, {
            waitUntil: "networkidle2"
        });
    } catch (e) {
        console.log("error loading: "+e);
    }

    await page.type('input[name="email"]', login);
    await page.type('input[name="password"]', password);

    await delay(2000);
    console.log('click submit');
    await page.click('form.b-loginreg__form > button.g-btn.m-rounded.m-block.m-lg.mb-0[type="submit"]');

    //intercepting call to user/login from here


})();

async function solveRecaptchaAndLogin(headers) {
    console.log('Solving Recaptcha Enterprise V2 .. ');
    try {
        tokenV2 = await anticaptcha.solveRecaptchaV2EnterpriseProxyless(
            url,
            sitekeyV2,
            {
                action: "login"
            });
    } catch (e) {
        failCallback("could not solve V2: "+e);
        return;
    }
    console.log("V2 token: ", tokenV2);

    console.log('Solving Recaptcha Enterprise V3 .. ');
    try {
        tokenV3 = await anticaptcha.solveRecaptchaV3Enterprise(
            url,
            sitekeyV3,
            0.9,
            "login");
    } catch (e) {
        failCallback("could not solve V3: "+e);
        return;
    }
    console.log("V3 token: ", tokenV3);

    headers['content-type'] = 'application/json; charset=utf-8';
    headers['accept'] = 'application/json';

    const payLoad = {
        "email" : login,
        "password"  :  password,
        "e-recaptcha-response"  :  tokenV3,
        "ec-recaptcha-response"  :  tokenV2,
        "encodedPassword" : encodedPassword
    };

    console.log("Submitting payload:");
    console.log(payLoad);

    axios.post('https://onlyfans.com/api2/v2/users/login',
        payLoad,
        {
            headers: headers
        })
        .then(res => {
            console.log('Login result:')
            console.log(res.data);
            if (res.data.userId) {
                console.log('cookies:');
                console.log(res.headers['set-cookie']);
                successCallback()
            } else {
                failCallback('Recaptcha had low score')
            }

        })
        .catch((error) => {
            console.log('Login error: '+error)
            failCallback(error)
        })


}

function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}



function successCallback() {
    console.log('Successfully passed test');
    console.log('closing browser .. ');
    browser.close();
}

function failCallback(code) {
    console.log('Failed to pass: '+code);
    console.log('closing browser .. ');
    browser.close();
}

