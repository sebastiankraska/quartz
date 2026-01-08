---
title: Cloud Resume Challenge
publish: true
tags:
date: 2026-01-08
modified: 2026-01-08T07:26:29+01:00
---

This site was built with Terraform and is hosted on AWS. It uses a serverless function to update this visit counter:

<div class="visit-count">Loading visit count...</div>

Go ahead, reload the page, the counter should go up. 

What happened? 

Your browser called an API gateway, which invoked a serverless function, which read and updated the visit counter that runs in a serverless database.

The site is based on the [Cloud Resume Challenge](https://cloudresumechallenge.dev/docs/the-challenge/aws/) and its [Terraform Extension](https://cloudresumechallenge.dev/docs/extensions/terraform-getting-started/).

Creating the site, showing it in interviews and being able to talk about it, helped me to get a job as a DevOps Engineer. 

Feel free to take a look at the source code, for example the [serverless function (Python)](https://github.com/sebastiankraska/cloud-resume-challenge-backend/blob/main/terraform/lambda/visit-counter.py) or the [Terraform code that created the function](https://github.com/sebastiankraska/cloud-resume-challenge-backend/blob/main/terraform/lambda.tf).

###### PS:
There is no resume here. I decided to use the *Cloud Resume Challenge* to create a blog instead.