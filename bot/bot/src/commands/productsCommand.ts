import { InlineKeyboard, CallbackQueryContext } from "grammy";
import { MyContext } from "../types.js";
import { products } from '../consts/products.js';


export const productsCommand = (ctx: CallbackQueryContext<MyContext>) => {
    ctx.answerCallbackQuery('Товары');

    const productsList = products.reduce((acc, cur) => {
      return (
        acc+ 
        `\n— ${cur.name}\nЦена: ${cur.price}руб.\nОписание: ${cur.description}`
      );
    }, '')

    const massageText = `Все товары:${productsList}`

    const keyboardButtonRows = products.map((product) => {
      return InlineKeyboard.text(product.name, `buyProduct–${product.id}`)
    })

    const keyboard = InlineKeyboard.from([
      keyboardButtonRows,
      [InlineKeyboard.text('<--Назад', 'BackToMenu')]
    ])
  
    ctx.callbackQuery.message?.editText(massageText, {
        reply_markup: keyboard,
      }
    );
  }
