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
const domainsOfInterest = ['www.allopneus.com', 'allopneus.com'];

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
        antigateResult = await anticaptcha.solveAntiGateTask(
            checkUrl,
            'Anti-bot screen bypass',
            {
                "css_selector": ".captcha__human__container"
            },
            proxyAddress,
            proxyPort,
            proxyLogin,
            proxyPassword,
            domainsOfInterest);
    } catch (e) {
        console.error("could not solve captcha: "+e.toString());
        return;
    }

    const fingerPrint = antigateResult.fingerprint;
    let topLevelDataDomeCookie = null;

    console.log(antigateResult);

    if (antigateResult.domainsOfInterest &&
        antigateResult.domainsOfInterest['allopneus.com'] &&
        antigateResult.domainsOfInterest['allopneus.com'].cookies &&
        antigateResult.domainsOfInterest['allopneus.com'].cookies['datadome']) {

        topLevelDataDomeCookie = antigateResult.domainsOfInterest['allopneus.com'].cookies['datadome'];

    } else {
        console.error('Something went wrong, got no datadome cookies. The page is not behind Datadome?')
        return;
    }

    console.log("\n\nAnti-bot screen bypassed.\n");
    console.log("Use this datadome cookie for navigation to the website:\n"+topLevelDataDomeCookie+"\n\n");

    //adding top level domain cookie to website's cookies
    antigateResult.cookies['datadome'] = topLevelDataDomeCookie;
    const targetCookies = joinCookies(antigateResult.cookies);
    console.log(`joined cookies: ${targetCookies}`);

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