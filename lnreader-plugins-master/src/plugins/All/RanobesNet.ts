import { fetchApi } from '@libs/fetch';
import { NovelStatus } from '@libs/novelStatus';
import { Plugin } from '@typings/plugin';
import { CheerioAPI, load as parseHTML } from 'cheerio';

class RanobesNet implements Plugin.PagePlugin {
  id = 'ranobesnet';
  name = 'Ranobes.net';
  icon = 'src/multisrc/ranobes/ranobes/icon.png'; // Path you gave me
  site = 'https://ranobes.net';
  version = '1.0.0';

  parseNovels($: CheerioAPI): Plugin.NovelItem[] {
    const novels: Plugin.NovelItem[] = [];
    $('.listupd .utao').each((i, el) => {
      const aTag = $(el).find('h4 > a');
      const path = aTag.attr('href')?.replace(this.site, '') || '';
      const name = aTag.text().trim();
      const cover = $(el).find('img').attr('src') || '';

      if (path && name) {
        novels.push({ name, path, cover });
      }
    });
    return novels;
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    const url = `${this.site}/novels/page/${pageNo}/`;
    const body = await fetchApi(url).then(r => r.text());
    return this.parseNovels(parseHTML(body));
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel & { totalPages: number }> {
    const url = this.site + novelPath;
    const body = await fetchApi(url).then(r => r.text());
    const $ = parseHTML(body);

    const novel: Plugin.SourceNovel & { totalPages: number } = {
      path: novelPath,
      name: $('h1.entry-title').text().trim(),
      cover: $('.ts-main-image > img').attr('src') || '',
      summary: $('.entry-content > p').first().text().trim(),
      author: $('span:contains("Author")').next('a').text().trim(),
      status: NovelStatus.Unknown,
      genres: $('span:contains("Genre")').nextAll('a').map((i, el) => $(el).text()).get().join(', '),
      chapters: [],
      totalPages: 1,
    };

    // Handle novel status
    const statusText = $('span:contains("Status")').next('span').text().trim();
    if (statusText.includes('Completed')) {
      novel.status = NovelStatus.Completed;
    } else if (statusText.includes('Ongoing')) {
      novel.status = NovelStatus.Ongoing;
    }

    // Parse initial chapters if available
    novel.chapters = this.parseChapters($);

    return novel;
  }

  parseChapters($: CheerioAPI): Plugin.ChapterItem[] {
    const chapters: Plugin.ChapterItem[] = [];

    $('.eplister li').each((i, el) => {
      const a = $(el).find('a');
      const path = a.attr('href')?.replace(this.site, '') || '';
      const name = a.text().trim();

      if (path && name) {
        chapters.push({
          name,
          path,
          chapterNumber: i + 1,
        });
      }
    });

    return chapters;
  }

  async parsePage(novelPath: string, page: string): Promise<Plugin.SourcePage> {
    const url = `${this.site}/chapters/${novelPath.replace('/novels/', '')}/page/${page}/`;
    const body = await fetchApi(url).then(r => r.text());
    const $ = parseHTML(body);
    const chapters = this.parseChapters($);

    return { chapters };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const url = this.site + chapterPath;
    const body = await fetchApi(url).then(r => r.text());
    const $ = parseHTML(body);
    return $('.entry-content').html() || '';
  }

  async searchNovels(searchTerm: string): Promise<Plugin.NovelItem[]> {
    const url = `${this.site}/?do=search&subaction=search&story=${encodeURIComponent(searchTerm)}`;
    const body = await fetchApi(url).then(r => r.text());
    return this.parseNovels(parseHTML(body));
  }
}

export default new RanobesNet();
