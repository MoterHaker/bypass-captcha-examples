/*

Datadome bypass with AntiGate template.
Install dependencies:

npm install @antiadmin/anticaptchaofficial axios


* */

const axios = require("axios");

const anticaptcha = require("@antiadmin/anticaptchaofficial");

//address behind datadome
const checkUrl = 'https://www.hermes.com/fr/fr/product/sculpture-casse-tete-samarcande-H311115Mv01/';

//Anti-captcha.com API key
const apiKey = 'API_KEY_HERE';


let browser = null;
let page = null;


(async () => {

    anticaptcha.setAPIKey(apiKey);
    const balance = await anticaptcha.getBalance();
    if (balance <= 0) {
        console.log('Topup your anti-captcha.com balance!');
        return;
    } else {
        console.log('API key balance is '+balance+', continuing');
        // anticaptcha.shutUp(); //uncomment for silent captcha recognition
    }


    try {
        antigateResult = await anticaptcha.solveAntiGateTask(
            checkUrl,
            'Anti-bot screen bypass',
            {
                "css_selector": ".captcha__human__container"
            });
    } catch (e) {
        console.error("could not solve captcha: "+e.toString());
        return;
    }

    if (typeof antigateResult.cookies.datadome == "undefined") {
        console.error('Something went wrong, got no datadome cookies. The page is not behind Datadome?');
        return;
    }

    console.log("\n\nAnti-bot screen bypassed.\n");
    console.log("Use these cookies for navigation to the website:\n");
    console.log(antigateResult.cookies);

    const fingerPrint = antigateResult.fingerprint;

    axios.get(checkUrl,
        { headers: {
            'User-Agent': fingerPrint['self.navigator.userAgent'],
            'Cookies': 'datadome='+antigateResult.cookies.datadome
        }  } )
    .then(response => {
        console.log(response);
    })
    .catch(function(e) {
      console.log(e);
    });


})();


