const Koa = require("koa"),
  Router = require("koa-router"),
  cheerio = require("cheerio"),
  charset = require("superagent-charset"),
  superagent = charset(require("superagent")),
  app = new Koa(),
  router = new Router();
var knex = require("knex")({
  client: "mysql", //指明数据库类型，还可以是pg，sqlite3等等
  connection: {
    //指明连接参数
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "mybooks"
  },
  debug: true, //指明是否开启debug模式，默认为true表示开启
  pool: {
    //指明数据库连接池的大小，默认为{min: 2, max: 10}
    min: 0,
    max: 7
  },
  acquireConnectionTimeout: 10000, //指明连接计时器大小，默认为60000ms
  migrations: {
    tableName: "migrations" //数据库迁移，可选
  }
});
router.get("/home", (ctx, next) => {
  let arr = [];
  let url, idx;
  idx = 0;
  let timer = setInterval(() => {
    idx++;
    if (idx > 20) {
      clearInterval(timer);
      return;
    }
    url = `https://s.ui.cn/index.html?p=${idx}&t=ds&type=project&other_w=%E9%98%85%E8%AF%BB&keywords=app`;
    timePlay(url);
    console.log('抓取'+idx + '次')
  }, 1000);
  let timePlay = (url) => {
    superagent.get(url).end(async (err, res) => {
      if (err) {
        console.log("页面丢失");
        rej();
      } else {
        let html = res.text,
          $ = cheerio.load(html, {
            decodeEntities: false,
            ignoreWhitespace: false,
            xmlMode: false,
            lowerCaseTags: false
          }); //用cheerio解析页面数据
        $(".post-works")
          .children("li")
          .each((index, element) => {
            let $element = $(element);
            if (index > 0) {
              arr.push({
                title: $element.find(".title").text(),
                exhibition: $element
                  .children(".cover")
                  .children("a")
                  .find("img")
                  .attr("data-original"),
                tips: $element
                  .children(".info")
                  .find(".mtn ")
                  .children(".classify")
                  .text(),
                avatar: $element
                  .children(".info")
                  .find(".user ")
                  .find("img")
                  .attr("src"),
                name: $element
                  .children(".info")
                  .find(".user ")
                  .find("strong")
                  .text()
              });
            }
          });
      }
      for (let i of arr) {
        const findRes = await knex("books")
          .select()
          .where("title", i.title);
        if (findRes.length) {
          console.log("数据已存在");
        } else {
          // 写入库
          await knex("books")
            .returning("id")
            .insert(i)
            .then(res => {
              console.log("success", res);
            });
        }
      }
    });
  };
  ctx.body = arr;
});
app.use(router.routes()).use(router.allowedMethods());
app.listen(3000);
