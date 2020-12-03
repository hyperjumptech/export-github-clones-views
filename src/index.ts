import { Command, flags } from "@oclif/command";
import axios, { AxiosRequestConfig } from "axios";

class GithubClonesViews extends Command {
  static description =
    "Fetch the clones and views numbers for Github repositories";
  static strict = false;

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    airtableKey: flags.string({ char: "k" }),
    airtableURL: flags.string({ char: "a" }),
    user: flags.string({ char: "u" }),
    password: flags.string({ char: "p" }),
  };

  async run() {
    const { argv: repositories, flags } = this.parse(GithubClonesViews);
    //console.log(`running my command with args: ${argv.join(",")}`);
    const axiosConfigForURL = (url: string): AxiosRequestConfig => ({
      method: "GET",
      url,
      auth: {
        username: flags.user || "",
        password: flags.password || "",
      },
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
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
            types: "clones",
          }));
          return {
            ...res.data,
            clones,
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
            types: "views",
          }));
          return {
            ...res.data,
            views,
          };
        })
      )
    );

    const allData = [].concat(
      ...[...clones.map((c) => c.clones), ...views.map((c) => c.views)]
    );

    const chunks = [];
    var i,
      j,
      temparray,
      chunk = 10;
    for (i = 0, j = allData.length; i < j; i += chunk) {
      temparray = allData.slice(i, i + chunk);
      // do whatever
      chunks.push(temparray);
    }

    console.log(chunks);

    const airtableRecords = chunks.map((chunk) => {
      return {
        records: chunk.map((a) => ({
          fields: a,
        })),
      };
    });

    const responses = await Promise.all(
      airtableRecords.map((rec) => {
        const data = JSON.stringify(rec, null, 2);
        return axios({
          method: "POST",
          url: flags.airtableURL,
          headers: {
            Authorization: `Bearer ${flags.airtableKey}`,
            "Content-Type": "application/json",
          },
          data,
        })
          .then((res) => res.data)
          .catch((error) => {
            if (error.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              console.log(error.response.data);
              console.log(error.response.status);
              console.log(error.response.headers);
            } else if (error.request) {
              // The request was made but no response was received
              // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
              // http.ClientRequest in node.js
              console.log(error.request);
            } else {
              // Something happened in setting up the request that triggered an Error
              console.log("Error", error.message);
            }
            console.log(error.config);
          });
      })
    );
  }
}

export = GithubClonesViews;
