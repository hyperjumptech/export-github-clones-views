import { Command, flags } from "@oclif/command";
import axios, { AxiosRequestConfig } from "axios";
import { MongoClient } from "mongodb";
import Listr from "listr";

class GithubClonesViews extends Command {
  static description =
    "Fetch the clones and views numbers for Github repositories.";
  static strict = false;

  static usage =
    "-u <GITHUB_USERNAME> -p <GITHUB_PASSWORD> -m <MONGODB_URI> githuborg/repo1 githuborg/repo2 githuborg/repo3 ...";

  static flags = {
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    mongo: flags.string({
      char: "m",
      description:
        "MongoDB URI, e.g., mongodb+srv://user:pass@cluster.mongodb.net/databasename. If not provided, this CLI will print the data to console. You can also set the value to MONGODB_URI environment variable.",
      env: "MONGODB_URI"
    }),
    user: flags.string({
      char: "u",
      description:
        "Github's username. You can also set the value to GITHUB_USERNAME environment variable.",
      required: true,
      env: "GITHUB_USERNAME"
    }),
    password: flags.string({
      char: "p",
      description:
        "Github's password or personal access token. You can create the token from https://github.com/settings/tokens. You can also set the value to GITHUB_PASSWORD environment variable.",
      required: true,
      env: "GITHUB_PASSWORD"
    })
  };

  async run() {
    const { argv: repositories, flags } = this.parse(GithubClonesViews);

    if (!repositories || repositories.length === 0) {
      this.error("Please provide at least 1 repository");
    }

    const { user: username, password, mongo } = flags;

    if (!mongo) {
      const clones = await fetchClones(repositories, username, password);
      const views = await fetchViews(repositories, username, password);
      const allData = mergeClonesAndViews(clones, views);
      this.log(JSON.stringify(allData, null, 2));
      return;
    }

    const tasks = new Listr([
      {
        title: "Fetch clones stats",
        task: async (ctx: any) => {
          const clones = await fetchClones(repositories, username, password);
          ctx.clones = clones;
        }
      },
      {
        title: "Fetch views stats",
        task: async (ctx: any) => {
          const views = await fetchViews(repositories, username, password);
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
          const message = await saveToDB({ clones, views, dbURI: mongo || "" });
          if (message) {
            task.title = message;
          }
        }
      }
    ]);

    tasks.run().catch((err: any) => {
      console.error(err);
    });
  }
}

const axiosConfigForURL = (
  url: string,
  username: string,
  password: string
): AxiosRequestConfig => ({
  method: "GET",
  url,
  auth: {
    username,
    password
  },
  headers: {
    Accept: "application/vnd.github.v3+json"
  }
});

const fetchClones = (
  repositories: Array<any>,
  username: string,
  password: string
) => {
  return Promise.all(
    repositories.map((repo) =>
      axios(
        axiosConfigForURL(
          `https://api.github.com/repos/${repo}/traffic/clones`,
          username,
          password
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
};

const fetchViews = (
  repositories: Array<any>,
  username: string,
  password: string
) => {
  return Promise.all(
    repositories.map((repo) =>
      axios(
        axiosConfigForURL(
          `https://api.github.com/repos/${repo}/traffic/views`,
          username,
          password
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
};

const mergeClonesAndViews = (clones: Array<any>, views: Array<any>) => {
  return [].concat(
    ...[...clones.map((c: any) => c.clones), ...views.map((c: any) => c.views)]
  );
};

const saveToDB = ({
  dbURI,
  clones,
  views
}: {
  dbURI: string;
  clones: any;
  views: any;
}) => {
  const allData = mergeClonesAndViews(clones, views);

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
        if (error.message.startsWith("E11000 duplicate key error collection")) {
          await client.close();
          resolve("Save to db: Skipped some duplicated records");
        } else {
          await client.close();
          reject(error);
        }
      }
    });
  });
};

export = GithubClonesViews;
