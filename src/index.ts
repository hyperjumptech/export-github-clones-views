import { Command, flags } from "@oclif/command";
import axios, { AxiosRequestConfig } from "axios";
import { MongoClient } from "mongodb";
import Listr from "listr";

class GithubClonesViews extends Command {
  static description =
    "Fetch the clones and views numbers for Github repositories";
  static strict = false;

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    mongo: flags.string({ char: "m", required: true, env: "MONGODB_URI" }),
    user: flags.string({
      char: "u",
      description: "Github's username",
      required: true,
      env: "GITHUB_USERNAME"
    }),
    password: flags.string({
      char: "p",
      description: "Github's password",
      required: true,
      env: "GITHUB_PASSWORD"
    })
  };

  async run() {
    const { argv: repositories, flags } = this.parse(GithubClonesViews);

    const axiosConfigForURL = (url: string): AxiosRequestConfig => ({
      method: "GET",
      url,
      auth: {
        username: flags.user || "",
        password: flags.password || ""
      },
      headers: {
        Accept: "application/vnd.github.v3+json"
      }
    });

    const tasks = new Listr([
      {
        title: "Fetch clones stats",
        task: async (ctx: any) => {
          const clones = await Promise.all(
            repositories.map((repo) =>
              axios(
                axiosConfigForURL(
                  `https://api.github.com/repos/${repo}/traffic/clones`
                )
              ).then((res) => {
                const clones = res.data.clones.map((clone: any) => ({
                  ...clone,
                  repo,
                  types: "clones"
                }));
                return {
                  ...res.data,
                  clones
                };
              })
            )
          );
          ctx.clones = clones;
        }
      },
      {
        title: "Fetch views stats",
        task: async (ctx: any) => {
          const views = await Promise.all(
            repositories.map((repo) =>
              axios(
                axiosConfigForURL(
                  `https://api.github.com/repos/${repo}/traffic/views`
                )
              ).then((res) => {
                const views = res.data.views.map((view: any) => ({
                  ...view,
                  repo,
                  types: "views"
                }));
                return {
                  ...res.data,
                  views
                };
              })
            )
          );
          ctx.views = views;
        }
      },
      {
        title: "Save to db",
        task: async (ctx: any, task: any) => {
          const { clones, views } = ctx;

          if (!clones || !views) {
            return;
          }

          const allData = [].concat(
            ...[
              ...clones.map((c: any) => c.clones),
              ...views.map((c: any) => c.views)
            ]
          );

          const dbURI = flags.mongo || "";

          const client = new MongoClient(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
          });

          return new Promise((resolve, reject) => {
            client.connect(async (err) => {
              const collection = client.db().collection("stats");
              try {
                await collection.createIndex(
                  { types: 1, timestamp: 1, repo: 1 },
                  { unique: true }
                );
                await collection.insertMany(allData, { ordered: false });
                await client.close();

                resolve();
              } catch (error) {
                if (
                  error.message.startsWith(
                    "E11000 duplicate key error collection"
                  )
                ) {
                  task.title = "Save to db: Skipped some duplicated records";
                  await client.close();
                  resolve();
                } else {
                  await client.close();
                  reject(error);
                }
              }
            });
          });
        }
      }
    ]);

    tasks.run().catch((err: any) => {
      console.error(err);
    });
  }
}

export = GithubClonesViews;
