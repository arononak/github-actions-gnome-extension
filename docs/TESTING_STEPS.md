# Testing Instructions before deploy 🧪

We want to ensure that our application works flawlessly before deployment. Below, you will find steps to test it to make sure everything is working as intended. 😊

##### 1. 🌐 Connect to the repository and check the data is being downloaded:
1. Select a repository that does not contain a github actions workflow - UserData,
2. Select the repository containing the github actions workflow        - UserData + RepoData,
3. Check data refresh,
4. Remove workflow,
5. Start workflow,
6. Cancel workflow,
7. Download artifact,
8. Watch repo & notification,

##### 2. ▶️ Launch the workflow:
1. Check changing status: SUCCESS/FAILURE -> IN_PROGRESS -> SUCCESS/FAILURE,
2. Check completed notification,

##### 3. 📵 No internet connection:
1. Check status label,

##### 4. 🔒 Logout
1. Check status label,

##### 5. 🧩 No CLI
1. Check status label,

##### 6. 🧮 Repo states:
1. LOGGED_NOT_CHOOSED_REPO,
2. REPO_WITHOUT_ACTIONS,
3. INCORRECT_REPOSITORY,

##### 7. ⚙️ Settings:
1. All settings,
