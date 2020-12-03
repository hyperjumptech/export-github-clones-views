import { Command, flags } from "@oclif/command";
import Listr from "listr";
import {
  fetchClones,
  fetchViews,
  mergeClonesAndViews,
  saveToDB
} from "./helper";

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

    await tasks.run();
  }
}

export = GithubClonesViews;
