import { VercelRequest, VercelResponse } from '@vercel/node'
import { getLang } from '../../../utils/lang'
import { fetchHTML } from "../../../utils/fetch";
import cheerio from "cheerio";

interface ServingSize {
  val: number;
  text: string;
}

interface Nutrisi {
  val: number;
  unit: string;
}

interface DataResponse {
  name: string;
  portion: string;
  energy: Nutrisi;
  calorie: Nutrisi;
  fat: Nutrisi;
  saturated_fat: Nutrisi;
  colestrol: Nutrisi;
  protein: Nutrisi;
  carbohydrate: Nutrisi;
  fiber: Nutrisi;
  sugar: Nutrisi;
  sodium: Nutrisi;
  serving_size: ServingSize[];
  debug: string;
}

export default async (request: VercelRequest, response: VercelResponse): Promise<void> => {
  const langConfig = getLang(String(request.query.lang))
  const detailUrl = request.query.url
  if (!detailUrl) {
    response.json({ error: 'please provide detailLink on search' })
    return
  }
  if (!langConfig) {
    response.json({ error: `${request.query.lang} are not supported` })
    return
  }

  const query: any = request.query.query;
  const portionamount = request.query.portionamount;
  const portionid = request.query.portionid;

  let _url = langConfig.baseUrl + detailUrl;
  const html = await fetchHTML(_url, {
    portionamount,
    portionid,
  });

  const $ = cheerio.load(html);
  
  let serving_size: FoundList[] = [];
  // let i=0;
  // let items: any = {};
  let name: string, portion: string;
  let energy: Nutrisi,
      calorie: Nutrisi,
      fat: Nutrisi,
      saturated_fat: Nutrisi,
      colestrol: Nutrisi,
      protein: Nutrisi,
      carbohydrate: Nutrisi,
      fiber: Nutrisi,
      sugar: Nutrisi,
      sodium: Nutrisi;

  /*
    let energy: { val: number; unit: string },
    calorie: { val: number; unit: string },
    fat: { val: number; unit: string },
    saturated_fat: { val: number; unit: string },
    colestrol: { val: number; unit: string },
    protein: { val: number; unit: string },
    carbohydrate: { val: number; unit: string },
    fiber: { val: number; unit: string },
    sugar: { val: number; unit: string },
    sodium: { val: number; unit: string };
  */

  $('select[name="portionid"] option').each((_, elem: any) => {
    // dropdown[i] = { "val": $(elem).val(), "text": $(elem).html() };
    // console.log($(elem).val());
    // console.log($(elem).html());
    // i++;
    serving_size.push({
      val: $(elem).val(),
      text: $(elem).html()
    });
  });

  $("div.summarypanelcontent").each((_, elem: any) => {
    const element = $(elem);
    const x = element.find("h1").text();
    if (x) {
      name = x;
    }
  });

  $("div.serving_size.black.serving_size_value").each((_, elem: any) => {
    const element = $(elem);
    const p = element.text();
    if (p) {
      portion = p;
    }
  });

  $("div.nutrient.left").each((_, elem: any) => {
    const element = $(elem);
    const normalizeText = element.text().replace(/(\r\n|\n|\r\t|\t|\r)/gm, "");
    let item;
    const nextELem = element.next().text();
    // console.log(nextELem);
    // normalizeText=
    /*Energi

      Lemak
      Lemak Jenuh
      Lemak tak Jenuh Ganda
      Lemak tak Jenuh Tunggal
      Kolesterol
      Protein
      Karbohidrat
      Serat
      Gula
      Sodium
      Kalium*/

    switch (normalizeText) {
      case "Energi":
        energy = { 
          "val": parseItem(nextELem, "kj"),
          "unit": "kj",
        };
        break;

      case "":
        if (nextELem.indexOf("kkal") !== -1) {
          calorie = { 
            "val": parseItem(nextELem, "kkal"),
            "unit": "kkal",
          };
        }
        break;

      case "Protein":
        protein = {
            "val": parseItem(nextELem, "protein"),
            "unit": "g",
          };
        break;

      case "Lemak":
        fat = { 
            "val": parseItem(nextELem, "fat"),
            "unit": "g",
          };
        break;

      case "Karbohidrat":
        carbohydrate = { 
            "val": parseItem(nextELem, "carb"),
            "unit": "g",
          };
        break;

      case "Lemak Jenuh":
        saturated_fat = { 
            "val": parseItem(nextELem, "saturated_fat"),
            "unit": "g",
          };
        break;

      case "Kolesterol":
        colestrol = { 
            "val": parseItem(nextELem, "colestrol"),
            "unit": "mg",
          };
        break;
      case "Gula":
        sugar = { 
            "val": parseItem(nextELem, "sugar"),
            "unit": "g",
          };
        break;

      case "Serat":
        fiber = { 
            "val": parseItem(nextELem, "fiber"),
            "unit": "g",
          };
        break;

      case "Sodium":
        sodium = { 
            "val": parseItem(nextELem, "sodium"),
            "unit": "mg",
          };
        break;

      default:
        break;
    }
  });

  function parseItem(
    item: string,
    type:
      | "kj"
      | "kkal"
      | "protein"
      | "fat"
      | "carb"
      | "saturated_fat"
      | "colestrol"
      | "sugar"
      | "fiber"
      | "sodium"
  ): number {
    const ret_val: any =
      item.replace(langConfig.detailRegex[type], "").replace(",", ".").trim() ||
      0;

    return ret_val;
  }

  /*response.json({
    status: 'work in progress',
    dropdown,
    items,
    debug: `${langConfig.baseUrl}${detailUrl}`
  })*/

  const data: DataResponse = {
    name,
    portion,
    energy,
    calorie,
    fat,
    saturated_fat,
    colestrol,
    protein,
    carbohydrate,
    fiber,
    sugar,
    sodium,
    serving_size,
    debug: `${langConfig.baseUrl}${detailUrl}`
  };
  response.setHeader("Cache-Control", "s-maxage=100, stale-while-revalidate");
  response.json(data);
}
