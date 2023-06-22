const puppeteer = require('puppeteer')
import { Browser } from 'puppeteer';

const url = 'https://books.toscrape.com/';

const main = async () => {
    const browser: Browser = await puppeteer.launch()
    console.log('123')
}


