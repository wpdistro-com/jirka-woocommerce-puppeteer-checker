const puppeteer = require('puppeteer');
const Imap = require('imap');
var conf = {
    website: {
        domain: "",
        additional: "",
        checkout: ""
    },
    country: "CZ",
    email: "EMAIL",
    phone: "PHONE",
    first_name: "Test",
    last_name: "Test",
    address: "Test",
    city: "Test",
    postcode: "10000"
}

function mailCheckingFunction() {
    var imap = new Imap({
        user: 'EMAIL',
        password: 'PASSWORD',
        host: 'HOST',
        port: 993,
        tls: true,
    });
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
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`https://${conf.website.domain}/${conf.website.additional}`);
    let element = await page.$$("*[class*=add_to_cart]");
    await element[0].click()
    await page.waitFor(1000);
    await page.goto(`https://${conf.website.domain}/${conf.website.checkout}`);
    if (page.$$("#billing_country").tagName == "select") await page.select('#billing_country', conf.country);
    await page.focus("#billing_phone");
    await page.keyboard.type(conf.phone);
    await page.focus("#billing_email");
    await page.keyboard.type(conf.email);
    await page.focus("#billing_first_name");
    await page.keyboard.type(conf.first_name);
    await page.focus("#billing_last_name")
    await page.keyboard.type(conf.last_name);
    await page.focus("#billing_address_1");
    await page.keyboard.type(conf.address);
    await page.focus("#billing_city");
    await page.keyboard.type(conf.city);
    await page.focus("#billing_postcode");
    await page.keyboard.type(conf.postcode);
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