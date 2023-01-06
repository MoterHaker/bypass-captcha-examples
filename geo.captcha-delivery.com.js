/*

Datadome bypass with AntiGate template.
Install dependencies:

npm install @antiadmin/anticaptchaofficial axios https-proxy-agent


* */

const axios = require("axios");
const httpsProxyAgent = require('https-proxy-agent');
const anticaptcha = require("@antiadmin/anticaptchaofficial");

//address behind datadome
const checkUrl = 'https://www.allopneus.com/liste/pneu-auto?saison%5B%5D=4seasons&saison%5B%5D=ete&saison%5B%5D=hiver&page=1';

//Anti-captcha.com API key
const apiKey = 'API_KEY_HERE';

// STOP! IMPORTANT! Shared proxy services won't work!
// Use ONLY self-installed proxies on your own infrastructure! Instruction: https://anti-captcha.com/apidoc/articles/how-to-install-squid
// Again and again people people insist they have best purchased proxies. NO YOU DO NOT!
// Absolutely recommended to read this FAQ about proxies: https://anti-captcha.com/faq/510_questions_about_solving_recaptcha_with_proxy__applies_to_funcaptcha__geetest__hcaptcha_
const proxyAddress = '11.22.33.44';
const proxyPort = 1234;
const proxyLogin = 'login';
const proxyPassword = 'pass';

const proxyString = `http://${proxyLogin}:${proxyPassword}@${proxyAddress}:${proxyPort}`;

const agent = new httpsProxyAgent(proxyString);



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

    let antigateResult = null;
    try {
        antigateResult = await anticaptcha.solveAntiBotCookieTask(
            checkUrl,
            'datadome',
            proxyAddress,
            proxyPort,
            proxyLogin,
            proxyPassword);
    } catch (e) {
        console.error("could not solve captcha: "+e.toString());
        return;
    }

    const fingerPrint = antigateResult.fingerprint;
    const targetCookies = joinCookies(antigateResult.cookies);
    console.log(`joined cookies: ${targetCookies}`);
    console.log(`user-agent: ${fingerPrint['self.navigator.userAgent']}`);

    try {
        let responseText = await axios.request({
            url: checkUrl,
            httpsAgent: agent,
            headers: {
                'User-Agent': fingerPrint['self.navigator.userAgent'],
                'Cookie': targetCookies,
                'Accept-Encoding': 'deflate',
                'Accept': 'text/html',
                'Accept-Language': 'en'
            }
        });
        console.log(responseText.data);
    } catch (e) {
        console.error('Could not request page')
        console.log(e.toString());
    }

})();


function joinCookies(object) {
    let resultArray = [];
    for (const key in object) {
        resultArray.push(key+"="+object[key])
    }
    return resultArray.join("; ");
}