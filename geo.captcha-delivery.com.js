//npm install puppeteer @antiadmin/anticaptchaofficial
const anticaptcha = require("@antiadmin/anticaptchaofficial");
const puppeteer = require("puppeteer");

//API key for anti-captcha.com
const anticaptchaAPIKey = 'YOUR_API_KEY';

//set your proxy credentials, without them it won't work!
//captcha must be solved from same IP address as the browser!
const proxyAddress = 'xx.yy.zz.aa';
const proxyPort = 1234;
const proxyUser = 'login';
const proxyPassword = 'password';
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36";


// Set which URL you want to bypass. Make sure it can be bypassed manually with your browser!
// may contain Recaptcha
// const url = 'https://geo.captcha-delivery.com/captcha/?initialCid=AHrlqAAAAAMAJQ461xCrf1MAkrn61g==&hash=A55FBF4311ED6F1BF9911EB71931D5&t=ic&s=17434&cid=EyHln~rVJIF7VgU..d2hXnCqN2vozcHvqa73MqvKA.0F~p8gW0lDnXF388wAl16nfCk4WdTv6ve3U-AzW3MFcpwU-R.aZkOXvXRy2A96rF&referer=https%3A%2F%2Fwww.footlocker.sg%2Fen%2Fp%2Fitem%3Fv%3D316700127604';

// may contain Geetest
const url = 'https://geo.captcha-delivery.com/captcha/?initialCid=AHrlqAAAAAMAyjC27s4nCV0AlQMdRA%3D%3D&hash=2211F522B61E269B869FA6EAFFB5E1&cid=P2gtFfd.snGFcRsDO5ZpQTId4q1Bh0HJTQ0npTA_6Eq-SDNCUf7i7d-hx2O-8tsMooDrDyQ8Pp-Cyx-kIkY%7EH7PGsoHZwzi9xtc6-BRNO.&t=fe&referer=https%3A%2F%2Fwww.hermes.com%2Ffr%2Ffr%2Fproduct%2Fvanille-galante-eau-de-toilette-and-vanille-galante-fourreau-cuir-V2HERMESSENCEVANILLEGALANTEpV24465pV24464%2F&s=13461';

let browser = null;
let page = null;
let targetCallbackElement = 'page';


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


        let options = {
            headless: false,
            ignoreHTTPSErrors: true,
            devtools: true,
            args: [
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        };
        if (proxyAddress && proxyPort) {
            options["args"].push('--proxy-server='+proxyAddress+':'+proxyPort);
        }
        console.log('opening browser with options:');
        console.log(options);
        browser = await puppeteer.launch(options);

        console.log('creating new page ..');
        page = await browser.newPage();

        console.log('changing window size .. ');
        await page.setViewport({width: 1360, height: 1000});

    } catch (e) {
        failCallback("could not open browser: "+e);
        return false;
    }

    //registering success/fail callbacks
    await page.exposeFunction("successCallback", successCallback);
    await page.exposeFunction("failCallback", failCallback);

    //deep user-agent setup
    await page.setUserAgent(userAgent);
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'platform', { get:() => 'Macintosh' });
        Object.defineProperty(navigator, 'productSub', { get:() => '20030107' });
        Object.defineProperty(navigator, 'vendor', { get:() => 'Google Inc.' });
    });


    await page.setRequestInterception(true);
    page.on('response', (response) => {
        if (response.url().indexOf('check') != -1) {
            console.log("check captcha response");
            console.log('status: '+response.status());
            (async () => {
                await page.waitForNavigation();
            })();
            if (response.status() !== 200) {
                failCallback("captcha result not accepted");
            } else {
                (async () => {
                    let value = await page.$eval('*', el => el.innerText);
                    console.log("\nresponse of the page:");
                    console.log("======================================================");
                    console.log(value);
                    console.log("======================================================");
                    if (value.indexOf(proxyAddress) !== -1 || value.indexOf('not a robot') !== -1) {
                        failCallback("asked for captcha once more");
                        if (targetCallbackElement === 'page') {
                            //Page will navigate to another one which contains iframe,
                            //We will intercept challenge, solve geetest and post challenge again
                            targetCallbackElement = 'iframe';
                        }
                    } else {
                        successCallback("successfully passed test");
                    }
                })();

            }




        }
    });

    page.on('request', (request) => {

        // console.log(request.url());
        if (request.url().indexOf('/recaptcha/api.js') != -1) {
            console.log('aborting request with URL '+request.url());
            console.log('captcha type: Recaptcha V2');
            request.abort();

            (async () => {

                let captchaResult = null;
                try {
                    console.log('solving recaptcha...');
                    captchaResult = await anticaptcha.solveRecaptchaV2Proxyless(url,
                        '6LccSjEUAAAAANCPhaM2c-WiRxCZ5CzsjR_vd8uX');
                    console.log('Recaptcha V2 token:')
                    console.log(captchaResult);
                } catch (e) {
                    failCallback('could not solve captcha: '+e);
                    return;
                }


                console.log('injecting grecaptcha.getResponse function');
                try {

                    const content =
                        'let grecaptcha = {' +
                        ' getResponse() {' +
                        '       return "'+captchaResult+'";' +
                        '   }' +
                        '};';
                    await page.addScriptTag({ content });
                } catch (e) {
                    console.log('failed to insert script: '+e);
                }

                try {
                    await page.evaluate(async () => {

                        //page's function which checks token at backend
                        captchaCallback();

                   });
                } catch (e) {
                    failCallback("could not post token: "+e);
                }

            })();

            return;
        }
        if (request.url().indexOf('geetest.com') != -1) {
            console.log('aborting request with URL '+request.url());
            console.log('captcha type: Geetest');
            request.abort();

            if (request.url().indexOf('challenge=') != -1) {

                (async () => {

                    let challenge = request.url().toString().match(/challenge=(.*?)&/)[1];
                    console.log('challenge: '+challenge);
                    let captchaResult = null;
                    try {
                        captchaResult = await anticaptcha.solveGeeTestProxyOn(url,
                            '1e505deed3832c02c96ca5abe70df9ab',
                            challenge,
                            'api-na.geetest.com',
                            '',
                            'http',
                            proxyAddress,
                            proxyPort,
                            proxyUser,
                            proxyPassword,
                            userAgent,
                            '')
                        console.log('Geetest captcha token:')
                        console.log(captchaResult);
                    } catch (e) {
                        failCallback('could not solve captcha');
                        return;
                    }

                    //check captcha result depending on where we are
                    //at top frame or in iframe
                    if (targetCallbackElement === 'page') {
                        console.log('posting token in page');
                        try {
                            await page.evaluate(async (captchaResult) => {

                                geetestResponse = {
                                    geetest_challenge: captchaResult.challenge,
                                    geetest_validate: captchaResult.validate,
                                    geetest_seccode: captchaResult.seccode,
                                };
                                captchaCallback();

                            }, captchaResult);
                        } catch (e) {
                            failCallback("could not post token on page: "+e);
                        }
                    }
                    if (targetCallbackElement === 'iframe') {
                        console.log('posting token in iframe');

                        const elementHandle = await page.$('iframe');
                        if (elementHandle === null) {
                            failCallback('elementHandle is null, make sure iframe is there');
                            return;
                        }
                        const frameContentFrame = await elementHandle.contentFrame();

                        try {
                            await frameContentFrame.evaluate(async (captchaResult) => {

                                geetestResponse = {
                                    geetest_challenge: captchaResult.challenge,
                                    geetest_validate: captchaResult.validate,
                                    geetest_seccode: captchaResult.seccode,
                                };
                                captchaCallback();

                            }, captchaResult);
                        } catch (e) {
                            failCallback("could not post token on iframe: "+e);
                        }
                    }

                })();

            }

        } else {
            request.continue();
        }
    });


    page.on('console', msg => console.log('EVAL LOG:', msg.text()));

    if (proxyPassword && proxyUser) {
        console.log('setting proxy authentication .. ('+proxyUser+":"+proxyPassword+')');
        await page.authenticate({
            username: proxyUser,
            password: proxyPassword,
        });
    }

    console.log('opening target page ..');
    try {
        await page.goto(url, {
            waitUntil: "networkidle0",
            timeout: 0
        });
    } catch (e) {
        console.log('got an error while opening a page:');
        console.log(e);
    }


})();



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

