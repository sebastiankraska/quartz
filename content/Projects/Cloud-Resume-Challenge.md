---
title: Cloud Resume Challenge
publish: true
tags:
date: 2026-01-08
modified: 2026-01-08T08:50:15+01:00
---

This site was built with Terraform and is hosted on AWS. It uses a serverless function to update this visit counter:

<div class="visit-count">Loading visit count...</div>

Go ahead, reload the page, the counter should go up. 

What happened? 

Your browser called an API gateway, which invoked a serverless function, which read and updated the visit counter that runs in a serverless database.

The site is based on the [Cloud Resume Challenge](https://cloudresumechallenge.dev/docs/the-challenge/aws/) and its [Terraform Extension](https://cloudresumechallenge.dev/docs/extensions/terraform-getting-started/).

Creating the site, showing it in interviews and being able to talk about it, helped me to get a job as a DevOps Engineer. 

Feel free to take a look at the source code, for example:
- [the Lambda function (Serverless) that reads and updates the Visit Counter](https://github.com/sebastiankraska/cloud-resume-challenge-backend/blob/main/terraform/lambda/visit-counter.py) 
- [the Terraform code that created that Lambda function](https://github.com/sebastiankraska/cloud-resume-challenge-backend/blob/main/terraform/lambda.tf).
- [The Github Workflow that uses Quartz to generate the static site and uploads it to AWS S3](https://github.com/sebastiankraska/quartz/blob/v4/.github/workflows/draft-content-push.yaml)

###### PS:
There is no resume here. I decided to use the *Cloud Resume Challenge* to create a blog instead.