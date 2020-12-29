//npm install puppeteer fs @antiadmin/anticaptchaofficial
// update your login credentials
// run with command: "node adobe.js"

//IMPORTANT:
//1. Adobe utilizes Recaptcha Enterprise V3 tokens for sign-in procedure.
//Their JS transmits token in modified header. We replace their obfuscated script with our version,
//where headers object is passed to our function "formatMyHeaders".
//When token is solved by Anti Captcha, the header is modified accordingly by adding the v3 token,
//and we manage to successfully sign in.
//2. Several attempts (about 10 times) should be made to sign in successfully.

const anticaptcha = require("@antiadmin/anticaptchaofficial");
const pup = require("puppeteer");
const fs = require('fs');


//API key for anti-captcha.com
const anticaptchaAPIKey = 'API_KEY_HERE';

//your login in Adobe
const login = 'some@email.com';


const url = 'https://auth.services.adobe.com/en_US/index.html?callback=https%3A%2F%2Fims-na1.adobelogin.com%2Fims%2Fadobeid%2FAdobeStockContributor1%2FAdobeID%2Ftoken%3Fredirect_uri%3Dhttps%253A%252F%252Fcontributor.stock.adobe.com%252F%2523from_ims%253Dtrue%2526old_hash%253D%2526api%253Dauthorize%26code_challenge_method%3Dplain%26use_ms_for_expiry%3Dtrue&client_id=AdobeStockContributor1&scope=AdobeID%2Copenid%2Ccreative_cloud%2Ccreative_sdk%2Ccc_private%2Cgnav%2Csao.stock%2Cadditional_info.address.mail_to%2Cadditional_info.dob%2Cread_organizations%2Cread_pc.stock%2Csao.cce_private%2Cportfolio.sdk.import&denied_callback=https%3A%2F%2Fims-na1.adobelogin.com%2Fims%2Fdenied%2FAdobeStockContributor1%3Fredirect_uri%3Dhttps%253A%252F%252Fcontributor.stock.adobe.com%252F%2523from_ims%253Dtrue%2526old_hash%253D%2526api%253Dauthorize%26response_type%3Dtoken&relay=58a9aa05-a15c-4582-b0fa-28c82758e27a&locale=en_US&flow_type=token&ctx_id=contributor_login&idp_flow_type=login#/';
let browser = null;
let page = null;
let token = null;

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
            devtools: true
        };
        console.log(options);
        browser = await pup.launch(options);


        console.log('creating new page ..');
        page = await browser.newPage();
    } catch (e) {
        failCallback("could not open browser: "+e);
        return false;
    }


    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (request.url().indexOf('scripts.js') !== -1) {
            console.log('aborting '+request.url());
            request.abort();
        } else {
            request.continue();
        }
    });

    console.log('solving captcha');

    try {
        token = await anticaptcha.solveRecaptchaV3Enterprise(url,'6LcGE-4ZAAAAAG2tFdbr7QqpimWAPqhLjI8_O_69',0.9,'');
    } catch (e) {
        failCallback("could not solve captcha: "+e);
        return;
    }

    console.log('token is ready: '+token);


    await page.goto(url, {
        waitUntil: "domcontentloaded"
    });

    console.log('adding script');
    try {

        const path = require('path');
        let file = fs.readFileSync(path.resolve('.', '_adobe.js'), 'utf8');
        //replacing 'RECAPTCHA_TOKEN' placeholder with V3 token
        file = file.replace('RECAPTCHA_TOKEN', token);
        await page.addScriptTag({ content: file });
    } catch (e) {
        console.log('failed to insert script: '+e);
    }

    await delay(3000);

    console.log('filling form ..');

    const input= await page.$(`#EmailPage-EmailField`)
    await input.focus();
    await page.type(`#EmailPage-EmailField`,login)


    await delay(1000);


    console.log('clicking the button');
    await page.click("#EmailForm > section.EmailPage__submit.mod-submit > div.ta-right > button");

    console.log("waiting 10 sec for backend");
    await delay(10000);


    let htmlContent = await page.$eval('*', el => el.innerText);

    if (htmlContent.indexOf('Confirm your phone number') !== -1 || htmlContent.indexOf('Verify your identity') !== -1) {
        successCallback();
    } else {
        failCallback('control string not found');
    }

})();



function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}


function successCallback() {
    console.log('Successfully passed test');
    // console.log('closing browser .. ');
    // browser.close();
}

function failCallback(code) {
    console.log('Failed to pass: '+code);
    // console.log('closing browser .. ');
    // browser.close();
}
