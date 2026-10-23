# 🚀 AWS EC2 Deployment Guide — Nutrition Tracker Microservices

> **Target Platform:** AWS EC2 Ubuntu 24.04 LTS  
> **Instance Recommendation:** `c7i-flex.large` (2 vCPU, 4 GB RAM)  
> **AWS Region:** `ap-southeast-2` (Sydney)  
> **Object Storage:** Amazon S3 (`nutrition-tracker-food-images-2026-new`)  
> **Security Architecture:** Port 80 Only Exposed (Nginx Reverse Proxy) • EC2 IAM Role (`NutritionTrackerEC2Role`)

---

## 📑 Table of Contents
1. [Architecture & Security Overview](#1-architecture--security-overview)
2. [AWS Prerequisites (Console / CLI)](#2-aws-prerequisites)
   - [2.1 S3 Bucket Creation](#21-s3-bucket-creation)
   - [2.2 IAM Role (`NutritionTrackerEC2Role`)](#22-iam-role-nutritiontrackerec2role)
   - [2.3 EC2 Security Group Rules](#23-ec2-security-group-rules)
   - [2.4 IMDSv2 Hop Limit for Docker (Mandatory)](#24-imdsv2-hop-limit-for-docker-mandatory)
3. [EC2 Instance Provisioning & Deployment](#3-ec2-instance-provisioning--deployment)
   - [Step 1: Connect to EC2](#step-1-connect-to-ec2)
   - [Step 2: Install System Packages, Docker & Maven](#step-2-install-system-packages-docker--maven)
   - [Step 3: Clone Codebase & Configure Environment](#step-3-clone-codebase--configure-environment)
   - [Step 4: Build Multi-Module JAR Artifacts](#step-4-build-multi-module-jar-artifacts)
   - [Step 5: Launch Production Containers](#step-5-launch-production-containers)
   - [Step 6: Verify Deployment Health](#step-6-verify-deployment-health)
4. [Operations & Maintenance](#4-operations--maintenance)

---

## 1. Architecture & Security Overview

```
                                  INTERNET (Public)
                                         │
                                         ▼ HTTP Port: 80
                    ┌─────────────────────────────────────────┐
                    │       EC2 Host: Ubuntu 24.04 LTS        │
                    │       (c7i-flex.large, 4 GB RAM)        │
                    │                                         │
                    │  ┌───────────────────────────────────┐  │
                    │  │      frontend (Nginx Proxy)       │  │
                    │  │            Port: 80               │  │
                    │  │  • Serves React SPA (Static)      │  │
                    │  │  • Proxies /api/* to Gateway      │  │
                    │  └─────────────────┬─────────────────┘  │
                    │                    │ Internal Network   │
                    │                    ▼ (Private)          │
                    │  ┌───────────────────────────────────┐  │
                    │  │        api-gateway (8088)         │  │
                    │  └─────────────────┬─────────────────┘  │
                    │                    │ Dynamic Routing    │
                    │                    ▼                    │
                    │  ┌───────────────────────────────────┐  │
                    │  │        eureka-server (8761)       │  │
                    │  └───────────────────────────────────┘  │
                    │       │             │            │      │
                    │       ▼             ▼            ▼      │
                    │ ┌──────────┐ ┌────────────┐ ┌─────────┐ │
                    │ │  User    │ │    Food    │ │  Meal   │ │
                    │ │ Profile  │ │  Database  │ │ Plan    │ │
                    │ │  (8080)  │ │   (3000)   │ │ (3001)  │ │
                    │ └──────────┘ └─────┬──────┘ └─────────┘ │
                    │                    │                    │
                    │                    │ AWS SDK v2         │
                    │                    │ (IMDSv2 IAM Role)  │
                    └────────────────────┼────────────────────┘
                                         ▼
                     ┌───────────────────────────────────────┐
                     │       Amazon S3 Private Bucket        │
                     │  nutrition-tracker-food-images-2026-new│
                     │         (Region: ap-southeast-2)      │
                     └───────────────────────────────────────┘
                                         ▲
                     ┌───────────────────┴───────────────────┐
                     │         MongoDB Atlas Cluster         │
                     │        (SSL/TLS Cloud Databases)      │
                     └───────────────────────────────────────┘
```

* **Zero Microservice Port Exposure:** Eureka, API Gateway, and backend services are not bound to host ports. Only Nginx on port 80 is exposed.
* **Same-Origin API Routing:** The browser accesses `http://<EC2_IP>/` and API calls flow to `http://<EC2_IP>/api/*`. No CORS errors, no exposed internal ports.
* **IAM Instance Profile Authentication:** No AWS Access Keys or `~/.aws` files are stored on EC2. The AWS SDK v2 automatically retrieves temporary credentials for `NutritionTrackerEC2Role` from the EC2 Instance Metadata Service.

---

## 2. AWS Prerequisites

### 2.1 S3 Bucket Creation
In AWS Console (Region: `ap-southeast-2` Sydney):
1. Go to **S3** > **Create bucket**.
2. **Bucket name:** `nutrition-tracker-food-images-2026-new`
3. **Region:** `ap-southeast-2` (Asia Pacific (Sydney)).
4. **Block Public Access settings:** Keep **Block all public access** checked (**ON**).
5. **Encryption:** Amazon S3-managed keys (SSE-S3).
6. Click **Create bucket**.

### 2.2 IAM Role (`NutritionTrackerEC2Role`)
1. In **IAM** > **Policies** > **Create policy** (JSON):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "NutritionTrackerS3Permissions",
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::nutrition-tracker-food-images-2026-new/food-images/*"
       }
     ]
   }
   ```
   Save policy as: `NutritionTrackerS3Policy`.
2. In **IAM** > **Roles** > **Create role**:
   - **Trusted entity type:** AWS service
   - **Use case:** EC2
   - **Attach policy:** Select `NutritionTrackerS3Policy`.
   - **Role name:** `NutritionTrackerEC2Role`
3. Attach `NutritionTrackerEC2Role` to your EC2 instance:
   - Select instance in EC2 Console > **Actions** > **Security** > **Modify IAM role** > Select `NutritionTrackerEC2Role`.

### 2.3 EC2 Security Group Rules
Attach a security group to your EC2 instance with these **Inbound rules**:
| Type | Protocol | Port Range | Source | Purpose |
|:---|:---|:---|:---|:---|
| `SSH` | TCP | `22` | `My IP` (`<your-ip>/32`) | Secure terminal access |
| `HTTP` | TCP | `80` | `0.0.0.0/0` | Public web traffic & API proxy |

*(Leave ports 8088, 8761, 8080, 3000, 3001, 3002 closed).*

### 2.4 IMDSv2 Hop Limit for Docker (Mandatory)
Docker containers run inside a bridge network, which is **one network hop** away from the EC2 host. By default, IMDSv2 has a hop limit of 1, causing container requests to time out.
Run this AWS CLI command once on your local machine or CloudShell to set the hop limit to 2:

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id <YOUR_EC2_INSTANCE_ID> \
  --http-put-response-hop-limit 2 \
  --http-endpoint enabled \
  --region ap-southeast-2
```

---

## 3. EC2 Instance Provisioning & Deployment

### Step 1: Connect to EC2
```powershell
ssh -i "nutrition-tracker-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

### Step 2: Install System Packages, Docker & Maven
Run these commands on Ubuntu 24.04:

```bash
# 1. Update system packages
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg git openjdk-21-jdk maven

# 2. Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine and Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Add ubuntu user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

Verify installations:
```bash
docker --version
docker compose version
java -version
mvn -version
```

### Step 3: Clone Codebase & Configure Environment
```bash
# Clone the repository
git clone <YOUR_GIT_REPOSITORY_URL> nutrition-tracker-msa
cd nutrition-tracker-msa

# Create production .env file
cp .env.example .env
nano .env
```

Ensure `.env` contains your actual MongoDB Atlas connection strings and JWT secret:
```env
# MongoDB Atlas URIs (replace with your real credentials)
USER_PROFILE_MONGODB_URI=mongodb+srv://<db_user>:<db_pass>@cluster0.xxxxxx.mongodb.net/user_profile_db?appName=Cluster0
FOOD_DB_MONGODB_URI=mongodb+srv://<db_user>:<db_pass>@cluster0.xxxxxx.mongodb.net/food_database?appName=Cluster0
MEAL_PLANNING_MONGODB_URI=mongodb+srv://<db_user>:<db_pass>@cluster0.xxxxxx.mongodb.net/food_database?appName=Cluster0
GROCERY_PLANNING_MONGODB_URI=mongodb+srv://<db_user>:<db_pass>@cluster0.xxxxxx.mongodb.net/grocery_planning_db?appName=Cluster0

# JWT Signing Secret (minimum 256 bits / 32 characters)
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# AWS S3 Settings
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET=nutrition-tracker-food-images-2026-new

# Leave empty for production same-origin proxy and IAM Role usage:
VITE_API_BASE_URL=
AWS_PROFILE=
```

### Step 4: Build Multi-Module JAR Artifacts
Because Dockerfiles use lightweight JRE base images (`eclipse-temurin:21-jre-alpine`) that copy prebuilt JARs (`COPY target/*.jar app.jar`), compile all 6 microservices on the host:

```bash
mvn clean package -DskipTests
```
*Expected output: `BUILD SUCCESS` across all 6 modules (Eureka-Server, API-Gateway, User-Profile, Food-Database, Meal-Planning, Grocery-Planning) in ~45 seconds.*

### Step 5: Launch Production Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 6: Verify Deployment Health
```bash
# Check container status and healthchecks
docker compose -f docker-compose.prod.yml ps
```

*Expected output:*
```
NAME                       STATUS                   PORTS
eureka-server              Up (healthy)             
food-database-service      Up (healthy)             
user-profile-service       Up                       
meal-planning-service      Up                       
grocery-planning-service   Up                       
api-gateway                Up (healthy)             
nutrition-frontend         Up (healthy)             0.0.0.0:80->80/tcp, [::]:80->80/tcp
```

Test the application in your browser:
```
http://<YOUR_EC2_PUBLIC_IP>
```
Log in, browse foods, and upload an image to verify full end-to-end functionality backed by Amazon S3 in Sydney (`ap-southeast-2`).

---

## 4. Operations & Maintenance

### View Live Logs
```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f food-database-service
docker compose -f docker-compose.prod.yml logs -f api-gateway
docker compose -f docker-compose.prod.yml logs -f nutrition-frontend
```

### Monitor Memory & CPU Usage
```bash
docker stats --no-stream
```
*(Total memory consumption for all 7 containers combined will remain stable under 2.8 GB, safely inside the 4 GB RAM limit of `c7i-flex.large`).*

### Redeploy / Update Application
When pulling code updates:
```bash
# 1. Pull latest changes
git pull origin main

# 2. Recompile updated JARs
mvn clean package -DskipTests

# 3. Rebuild and restart updated containers with zero downtime
docker compose -f docker-compose.prod.yml up -d --build
```

### Stop / Restart Stack
```bash
# Stop all services gracefully
docker compose -f docker-compose.prod.yml down

# Restart all services
docker compose -f docker-compose.prod.yml up -d
```
