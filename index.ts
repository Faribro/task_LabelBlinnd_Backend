import { GeolocationOptions } from 'puppeteer';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { config } from 'dotenv';
const puppeteer = require('puppeteer');


config();

const url = 'https://www.instacart.com/store/foodmaxx/storefront/';

interface ProductData {
  productName: string;
  sizes: string[];
  price: number;
  ingredients: string[];
  nutritionInfo: string;
  description: string;
  images: string[];
  vegetarian: boolean;
}

const scrapeData = async (): Promise<ProductData[]> => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Set geolocation to a default location (San Francisco, California)
  const geolocation: GeolocationOptions = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 1,
  };
  await page.setGeolocation(geolocation);

  await page.goto(url);

  const productData: ProductData[] = await page.evaluate(() => {
    const convertPrice = (priceString: string): number => {
      const price = priceString.replace('£', '').trim();
      return parseFloat(price);
    };

    const extractImages = (productElement: Element): string[] => {
      const imageElements = Array.from(productElement.querySelectorAll('.slick-slide img'));
      return imageElements.map((img) => img.getAttribute('src') || '');
    };

    const extractSizes = (productElement: Element): string[] => {
      const sizeElements = Array.from(productElement.querySelectorAll('.product-variants input[type="radio"]'));
      return sizeElements.map((size) => size.getAttribute('value') || '');
    };

    const extractIngredients = (productElement: Element): string[] => {
      const ingredientElements = Array.from(productElement.querySelectorAll('.recipe-ingredients li'));
      return ingredientElements.map((ingredient) => ingredient.textContent || '');
    };

    const isVegetarian = (productElement: Element): boolean => {
      const logoTextElement = productElement.querySelector('.icon-vegetarian');
      return !!logoTextElement;
    };

    const productCards = Array.from(document.querySelectorAll('.product-item'));
    console.log('Product Cards:', productCards.length); // Added console log
    const data: ProductData[] = productCards.map((product) => {
      const productName = (product.querySelector('.product-title') as HTMLElement)?.innerText || '';
      console.log('Product Name:', productName); // Added console log

      const sizes = extractSizes(product);
      console.log('Sizes:', sizes); // Added console log

      const priceString = (product.querySelector('.price') as HTMLElement)?.innerText || '';
      const price = convertPrice(priceString);
      console.log('Price:', price); // Added console log

      const ingredients = extractIngredients(product);
      console.log('Ingredients:', ingredients); // Added console log

      const nutritionInfo = (product.querySelector('.product-nutrition') as HTMLElement)?.innerText || '';
      console.log('Nutrition Info:', nutritionInfo); // Added console log

      const description = (product.querySelector('.description') as HTMLElement)?.innerText || '';
      console.log('Description:', description); // Added console log

      const images = extractImages(product);
      console.log('Images:', images); // Added console log

      const vegetarian = isVegetarian(product);
      console.log('Is Vegetarian:', vegetarian); // Added console log

      return {
        productName,
        sizes,
        price,
        ingredients,
        nutritionInfo,
        description,
        images,
        vegetarian,
      };
    });

    console.log('Scraped Data:', data); // Added console log

    return data;
  });

  await browser.close();

  return productData;
};

const storeDataInMongoDB = async (data: ProductData[]): Promise<void> => {
  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.DB_NAME!;
  const collectionName = process.env.COLLECTION_NAME!;

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true } as MongoClientOptions);
  await client.connect();

  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  try {
    if (data.length === 0) {
      throw new Error('No documents to insert');
    }

    const result = await collection.insertMany(data);
    if (result.insertedCount > 0) {
      console.log(`${result.insertedCount} documents inserted into MongoDB`);
    } else {
      console.log('No documents were inserted');
    }
  } catch (error) {
    console.error('An error occurred while inserting documents:', error);
  }

  client.close();
};

const main = async (): Promise<void> => {
  try {
    const scrapedData = await scrapeData();
    console.log('Scraped Data:', scrapedData);
    await storeDataInMongoDB(scrapedData);
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

const browser = await puppeteer.launch({
  headless: false,
  timeout: 60000, // Increase the timeout to 60 seconds
});


main();
