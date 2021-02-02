//npm install puppeteer fs @antiadmin/anticaptchaofficial
// run with command: "node store.steam-powered.com.js"

//IMPORTANT:
//1. Steam utilizes Recaptcha Enterprise V2, which is not the same as usual Recaptcha V2.
//Several attempts may be required to bypass captcha. Try this script at least 10 times.
//
//2. Script "_store.steam-powered.com.js" is what the original page is including in joinsteam.js, with little modifications:
// - variable "recaptchaToken" is added
// - function "CaptchaText" returns recaptchaToken variable
// - added "sValueResolve" variable which we replace later with our promise-resolve function
// - in function RenderRecaptcha added call of sValueResolve function to pass s-value to our script
//3. If something gets broken on the page, replace content of "_store.steam-powered.com.js" with updated code
//and add modifications I've described above to it.
//

const anticaptcha = require("@antiadmin/anticaptchaofficial");
const pup = require("puppeteer");
const fs = require('fs');


//API key for anti-captcha.com
const anticaptchaAPIKey = 'API_KEY_HERE';

const url = 'https://store.steampowered.com/join';
const sitekey = '6LdIFr0ZAAAAAO3vz0O0OQrtAefzdJcWQM2TMYQH';
const login = makeid(10)+'@gmail.com';

let browser = null;
let page = null;
let token = null;


const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36";


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

    await page.setUserAgent(userAgent);
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'platform', { get:() => 'Macintosh' });
        Object.defineProperty(navigator, 'productSub', { get:() => '20030107' });
        Object.defineProperty(navigator, 'vendor', { get:() => 'Google Inc.' });
    });

    page.on('console', msg => console.log('EVAL LOG:', msg.text()));

    await page.setRequestInterception(true);
    page.on('request', (request) => {
        //abort to replace with out version of this file
        if (request.url().indexOf('joinsteam.js') !== -1) {
            console.log('aborting '+request.url());
            request.abort();
        } else {
            request.continue();
        }
    });
    page.on('response', (response) => {
        if (response.url().indexOf('login') !== -1 && response.request().method() === 'POST') {
            console.log("\n\n==== captcha check response ====\n\n");
            console.log('status: '+response.status());
            if (response.status() !== 302) {
                failCallback("captcha result not accepted");
            } else {
                successCallback("successfully passed test");
            }
        }
    });





    console.log("going to "+url);
    try {
        await page.goto(url, {
            waitUntil: "domcontentloaded"
        });
    } catch (e) {
        console.log("error loading: "+e);
    }


    console.log('injecting a script');
    try {

        const path = require('path');
        let file = fs.readFileSync(path.resolve('.', '_store.steam-powered.com.js'), 'utf8');
        await page.addScriptTag({ content: file });
    } catch (e) {
        console.log('failed to insert script: '+e);
    }


    const getSValue = () => {
        return page.evaluate(async () => {

            return await new Promise(resolve => {

                sValueResolve = resolve;


                RefreshCaptcha();

            })
        });
    };


    const sValue = await getSValue();
    console.log('s value:');
    console.log(sValue);


    console.log('solving captcha');

    const loginInput= await page.$(`#email`)
    await loginInput.focus();
    await page.type(`#email`,login)

    await delay(500);

    const loginInput2= await page.$(`#reenter_email`)
    await loginInput2.focus();
    await page.type(`#reenter_email`,login)

    await delay(500);

    await page.evaluate(() => {
        document.querySelector("#i_agree_check").parentElement.click();
    });



    try {
        token = await anticaptcha.solveRecaptchaV2EnterpriseProxyless(
            url,
            sitekey,
            {
                s: sValue.s
            });
    } catch (e) {
        failCallback("could not solve captcha: "+e);
        return;
    }

    console.log('token is ready: '+token);


    await page.evaluate(async (token) => {

        recaptchaToken = token;


        StartCreationSession();


    }, token);


})();



function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}



function successCallback() {
    console.log('Successfully passed: ');
    // console.log('closing browser .. ');
    // browser.close();
}

function failCallback(code) {
    console.log('Failed to pass: '+code);
    // console.log('closing browser .. ');
    // browser.close();
}


function makeid(length) {
   let result           = '';
   let characters       = 'abcdefghijklmnopqrstuvwxyz';
   let charactersLength = characters.length;
   for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}