import { VercelResponse, VercelRequest } from "@vercel/node";
import cheerio from "cheerio";
import { fetchHTML } from "../../../utils/fetch";
import { getLang } from "../../../utils/lang";

interface ServingList {
  name: string;
  calories: number;
}

interface FoundList {
  title: string;
  serving: string;
  otherServing: ServingList[];
  calories: number;
  fat: number;
  carbo: number;
  protein: number;
  detailLink: string;
}

interface DataResponse {
  notes: string;
  items: FoundList[];
  next: number;
  prev: number;
  current: number;
  total: number;
}

export default async (
  request: VercelRequest,
  response: VercelResponse
): Promise<void> => {
  const url = request.headers["x-forwarded-host"];
  const proto = request.headers["x-forwarded-proto"];
  const query: any = request.query.query;
  const page: any = +request.query.page || 0;
  const langConfig = getLang(String(request.query.lang));

  if (!langConfig) {
    response.json({ error: `${request.query.lang} are not supported` });
    return;
  }

  if (!query) {
    response.json({ error: "Please insert a query, q=??" });
    return;
  }

  const html = await fetchHTML(langConfig.searchUrl, {
    q: query,
    pg: page,
  });
  const $ = cheerio.load(html);
  const items: FoundList[] = [];

  $("table.generic.searchResult td.borderBottom").each((_, elem: any) => {
    const element = $(elem);
    const title = element.find("a.prominent");
    const linkText = title.text();
    const detailLink = title.attr("href");
    const normalizeText = element
      .find("div.smallText.greyText.greyLink")
      .text()
      .replace(/(\t, )/gm, "|")
      .replace(/(\r\n|\n|\r\t|\t|\r)/gm, "");
    // console.log(normalizeText);
    const splitSection = normalizeText.split(langConfig.otherSizes);
    const splitGeneralInfoString = splitSection[0].split(" - ");
    const generalInfo = splitGeneralInfoString[1].split("|");

    const calories =
      +generalInfo[0]
      .replace(langConfig.measurementRegex.calories, "") || 0;

    // console.log(splitGeneralInfoString);
    
    const fat =
      +generalInfo[1]
        .replace(langConfig.measurementRegex.fat, "")
        .replace(",", ".") || 0;

    const carbo =
      +generalInfo[2]
        .replace(langConfig.measurementRegex.carb, "")
        .replace(",", ".") || 0;

    const protein =
      +generalInfo[3]
        .replace(langConfig.measurementRegex.protein, "")
        .replace(",", ".") || 0;

    // Search other serving method
    /*const otherServing: ServingList[] = [];
    if (splitSection[1]) {
      const val = splitSection[1].split("|");
      val.pop();

      val.forEach((vl) => {
        const normalize = vl.split("-");
        otherServing.push({
          name: normalize[0] ? normalize[0] : "No Name",
          calories: normalize[1]
            ? +normalize[1].replace(langConfig.caloriesPrefix, "")
            : 0,
        });
      });
    }*/

    items.push({
      title: linkText,
      protein,
      fat,
      carbo,
      calories,
      // otherServing,
      serving: splitGeneralInfoString[0],
      detailLink: `${proto}://${url}/api/${
        langConfig.lang
      }/detail?url=${encodeURIComponent(detailLink)}`,
    });
  });

  const searchSum = $(".searchResultSummary").text().split(" ");
  const total = parseInt(searchSum[4]);
  const endOfPage = total === parseInt(searchSum[2]);
  const startOfPage = page < 1;
  const next = endOfPage ? 0 : parseInt(page) + 1;
  const prev = startOfPage ? 0 : parseInt(page) - 1;
  const data: DataResponse = {
    // notes: "The measurement used for protein, fat, carbo, are in default serving",
    items,
    total,
    prev,
    next,
    current: parseInt(page),
  };
  response.setHeader("Cache-Control", "s-maxage=100, stale-while-revalidate");
  response.json(data);
};
