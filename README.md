# export-github-clones-views

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@hyperjumptech/export-github-clones-views.svg)](https://npmjs.org/package/@hyperjumptech/export-github-clones-views)
[![License](https://img.shields.io/npm/l/@hyperjumptech/export-github-clones-views)](https://github.com/hyperjumptech/export-github-clones-views/blob/master/package.json)

# About

This is a CLI to fetch the daily number of **clones** and **views** of one or many github repositories to which you have push access. You can run this script regularly to track the traffic of clones and views of your repositories in a long term since the data shown in a Github repository website cannot be exported and only shows up to few days back.

# Prerequisite

1. Create a Personal Access Token in your [Github settings](https://github.com/settings/tokens). Make sure you select the **repo** scope.
2. Optionally run a mongodb server to store the data.

# Install

```sh-session
$ npm install -g @hyperjumptech/export-github-clones-views
```

# Usage

To simply print the data to console, run the following

```sh-session
$ export-github-clones-views -u <GITHUB_USERNAME> -p <GITHUB_PASSWORD> user/reponame1 organization/reponame2 ...
```

To store the data to mongodb, provide the mongodb uri,

```sh-session
$ export-github-clones-views -u <GITHUB_USERNAME> -p <GITHUB_PASSWORD> -m <MONGODB_URI> user/reponame1 organization/reponame2 ...
```

Notes:

1. You can add any number of repositories as the argument of the command.
2. The repository needs to include both the username/organization and the repository name, e.g., `hyperjumptech/export-github-clones-views`.
3. Example of `MONGODB_URI`: `mongodb+srv://username:password@mongodb.net/database-name`.
4. Use the Personal Access Token you generated as `GITHUB_PASSWORD`
5. You can use environment variables instead of command line arguments. Check out the help of the command line.

# Articles

- Bahasa Indonesia: [Ketika Jumlah Git Clone Menjadi KPI](https://medium.com/hyperjump-tech/melacak-jumlah-git-clone-per-hari-di-github-1c187eaf90bb).
- English: [How to track the traffic of views and clones of Github Repository](https://nico.fyi/articles/track-github-clones-views-traffic)
