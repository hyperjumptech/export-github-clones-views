import { Command, flags } from "@oclif/command";
import axios, { AxiosRequestConfig } from "axios";
import { MongoClient } from "mongodb";

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

    const allData = [].concat(
      ...[...clones.map((c) => c.clones), ...views.map((c) => c.views)]
    );

    const dbURI = flags.mongo || "";

    const client = new MongoClient(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    client.connect(async (err) => {
      const collection = client.db().collection("stats");
      try {
        await collection.createIndex(
          { types: 1, timestamp: 1, repo: 1 },
          { unique: true }
        );
        await collection.insertMany(allData, { ordered: false });
        await client.close();
        process.exit(0);
      } catch (error) {
        console.log(error);
        process.exit(1);
      }
    });
  }
}

export = GithubClonesViews;
