import axios, { AxiosRequestConfig } from "axios";
import { MongoClient } from "mongodb";

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

export const fetchClones = (
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

export const fetchViews = (
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

export const mergeClonesAndViews = (clones: Array<any>, views: Array<any>) => {
  return [].concat(
    ...[...clones.map((c: any) => c.clones), ...views.map((c: any) => c.views)]
  );
};

export const saveToDB = ({
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
    client.connect(async () => {
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
