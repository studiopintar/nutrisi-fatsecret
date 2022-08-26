import { VercelResponse, VercelRequest } from "@vercel/node";
import cheerio from "cheerio";
import { fetchHTML } from "../../utils/fetch";
import { getLang } from "../../utils/lang";

interface DefaultMenu {
  image: string;
  title: string;
  desc: string;
}

// eslint-disable-next-line @typescript
export default async (
  request: VercelRequest,
  response: VercelResponse
): Promise<void> => {
  const langConfig = getLang(String(request.query.lang));
  if (!langConfig) {
    response.json({ error: `${request.query.lang} are not supported` });
    return;
  }
  const html = await fetchHTML(langConfig.menuUrl, {});
  const $ = cheerio.load(html);
  const menus: DefaultMenu[] = [];
  $("table.generic.common td.borderBottom").each((_, elem: any) => {
    const element = $(elem).children(".details");
    const title = element.find("a.prominent").text();
    const desc = element.find(".smallText").text().replace("lagi", "");
    const image = $(elem).find("a > img").attr("src");
    const menu: DefaultMenu = {
      title,
      desc,
      image,
    };
    menus.push(menu);
  });
  response.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate");
  response.json(menus);
};
