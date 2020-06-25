const puppeteer = require('puppeteer');
const Imap = require('imap');
//const nodemailer = require("nodemailer");
var fs = require('fs');
var conf = JSON.parse(fs.readFileSync('config.json', 'utf8'));


/*async function send_email_alert(){
    let transporter = nodemailer.createTransport(conf.sendingEmail.transporter);
    let info = await transporter.sendMail(conf.sendingEmail.info);
}*/

function mailCheckingFunction() {
    var imap = new Imap(conf.emailToCheck);
    imap.once('ready', function() {
        imap.openBox('INBOX', false, function(err, box) {
            imap.search(['UNSEEN', ['FROM', conf.website.domain]], function(err, results) {
                if (results.length > 0) {
                    console.log("Test successful");
                    imap.setFlags(results, ['\\Seen'], function(err) {
                        if (!err) {
                            console.log("Marked as read");
                        } else {
                            console.log(JSON.stringify(err, null, 2));
                        }
                    });
                    imap.end();
                } else {
                    console.log("Test unsuccessful, no email was received");
                    imap.end();
                }
            });
        });
    });

    imap.once('error', function(err) {
        console.log(err);
    });

    imap.once('end', function() {
        console.log('Connection ended');
    });

    imap.connect();
}
(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto(`https://${conf.website.domain}/${conf.website.product_url}`);
    let element = await page.$$("*[class*=add_to_cart]");
    await element[0].click()
    await page.waitFor(1000);
    await page.goto(`https://${conf.website.domain}/${conf.website.checkout_url}`);
    let country = await page.$("#billing_country");
    country = await (await country.getProperty('tagName')).jsonValue();
    if (country.toLowerCase() == "select") await page.select('#billing_country', conf.website.country);
    await page.focus("#billing_phone");
    await page.keyboard.type(conf.website.phone);
    await page.focus("#billing_email");
    await page.keyboard.type(conf.website.email);
    await page.focus("#billing_first_name");
    await page.keyboard.type(conf.website.first_name);
    await page.focus("#billing_last_name")
    await page.keyboard.type(conf.website.last_name);
    await page.focus("#billing_address_1");
    await page.keyboard.type(conf.website.address);
    await page.focus("#billing_city");
    await page.keyboard.type(conf.website.city);
    await page.focus("#billing_postcode");
    await page.keyboard.type(conf.website.postcode);
    await page.evaluate(() => {
        var test = document.querySelector('input[id=payment_method_bacs]')
        test.click();
        jQuery('body').trigger('update_checkout');
    })
    await page.evaluate(() => {
        document.querySelectorAll(".woocommerce-terms-and-conditions-wrapper").forEach(function(element) {
            let input = element.querySelector("input");
            if (input != null) input.click();
        });
    });
    await page.waitFor(1000);
    element = await page.$("button[name=woocommerce_checkout_place_order]");
    await element.click();
    await page.waitFor(20000);
    await mailCheckingFunction();
    await browser.close();
})();