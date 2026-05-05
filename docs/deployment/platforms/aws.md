# AWS Deployment Guide

This guide covers deploying the Kavach authentication system on Amazon Web Services (AWS) using various AWS services including ECS, RDS, ElastiCache, and Application Load Balancer for a scalable, production-ready deployment.

## Architecture Overview

```mermaid
graph TB
    Internet[Internet] --> ALB[Application Load Balancer]
    ALB --> ECS[ECS Fargate Tasks]
    ECS --> RDS[(RDS PostgreSQL)]
    ECS --> Redis[(ElastiCache Redis)]
    ECS --> S3[S3 Bucket]
    
    subgraph VPC[VPC]
        subgraph PublicSubnet[Public Subnets]
            ALB
        end
        
        subgraph PrivateSubnet[Private Subnets]
            ECS
            RDS
            Redis
        end
    end
    
    Route53[Route 53] --> ALB
    CloudWatch[CloudWatch] --> ECS
    ECR[ECR] --> ECS
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- Docker installed for building images
- Domain name for SSL certificate
- AWS account with billing enabled

## AWS Services Used

- **ECS Fargate**: Container orchestration
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Session storage and caching
- **Application Load Balancer**: Load balancing and SSL termination
- **Route 53**: DNS management
- **Certificate Manager**: SSL certificates
- **ECR**: Container registry
- **CloudWatch**: Monitoring and logging
- **VPC**: Network isolation
- **IAM**: Access management

## Step 1: Infrastructure Setup

### VPC and Networking

Create a VPC with public and private subnets:

```bash
# Create VPC
aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=kavach-auth-vpc}]'

# Create Internet Gateway
aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=kavach-auth-igw}]'

# Create public subnets
aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.0.1.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=kavach-auth-public-1a}]'

aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.0.2.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=kavach-auth-public-1b}]'

# Create private subnets
aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.0.3.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=kavach-auth-private-1a}]'

aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.0.4.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=kavach-auth-private-1b}]'
```

### CloudFormation Template

Use this CloudFormation template for automated infrastructure setup:

```yaml
# infrastructure.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Kavach Auth System Infrastructure'

Parameters:
  DomainName:
    Type: String
    Description: Domain name for the application
    Default: auth.yourdomain.com
  
  DBPassword:
    Type: String
    NoEcho: true
    Description: Database password
    MinLength: 8

Resources:
  # VPC
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: kavach-auth-vpc

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: kavach-auth-igw

  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      InternetGatewayId: !Ref InternetGateway
      VpcId: !Ref VPC

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: kavach-auth-public-1

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: kavach-auth-public-2

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.3.0/24
      Tags:
        - Key: Name
          Value: kavach-auth-private-1

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.4.0/24
      Tags:
        - Key: Name
          Value: kavach-auth-private-2

  # RDS Subnet Group
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS database
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Name
          Value: kavach-auth-db-subnet-group

  # RDS Instance
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: kavach-auth-db
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: '15.4'
      MasterUsername: postgres
      MasterUserPassword: !Ref DBPassword
      AllocatedStorage: 20
      StorageType: gp2
      DBSubnetGroupName: !Ref DBSubnetGroup
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      BackupRetentionPeriod: 7
      MultiAZ: false
      StorageEncrypted: true
      DeletionProtection: true

  # ElastiCache Subnet Group
  CacheSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      Description: Subnet group for ElastiCache
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  # ElastiCache Redis
  RedisCache:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: cache.t3.micro
      Engine: redis
      NumCacheNodes: 1
      CacheSubnetGroupName: !Ref CacheSubnetGroup
      VpcSecurityGroupIds:
        - !Ref RedisSecurityGroup

  # Security Groups
  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Application Load Balancer
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  ECSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for ECS tasks
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 3000
          ToPort: 3000
          SourceSecurityGroupId: !Ref ALBSecurityGroup

  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for RDS database
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref ECSSecurityGroup

  RedisSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Redis cache
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 6379
          ToPort: 6379
          SourceSecurityGroupId: !Ref ECSSecurityGroup

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub ${AWS::StackName}-VPC-ID

  DatabaseEndpoint:
    Description: RDS instance endpoint
    Value: !GetAtt Database.Endpoint.Address
    Export:
      Name: !Sub ${AWS::StackName}-DB-Endpoint

  RedisEndpoint:
    Description: Redis cache endpoint
    Value: !GetAtt RedisCache.RedisEndpoint.Address
    Export:
      Name: !Sub ${AWS::StackName}-Redis-Endpoint
```

Deploy the infrastructure:

```bash
aws cloudformation create-stack \
    --stack-name kavach-auth-infrastructure \
    --template-body file://infrastructure.yml \
    --parameters ParameterKey=DomainName,ParameterValue=auth.yourdomain.com \
                 ParameterKey=DBPassword,ParameterValue=YourSecurePassword123
```

## Step 2: Container Registry Setup

### Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
    --repository-name kavach-auth \
    --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and tag image
docker build -t kavach-auth .
docker tag kavach-auth:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/kavach-auth:latest

# Push image
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/kavach-auth:latest
```

### Automated Build with GitHub Actions

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: kavach-auth

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

    - name: Update ECS service
      run: |
        aws ecs update-service \
          --cluster kavach-auth-cluster \
          --service kavach-auth-service \
          --force-new-deployment
```

## Step 3: ECS Setup

### Task Definition

```json
{
  "family": "kavach-auth-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "kavach-auth",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/kavach-auth:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/kavach-auth/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/kavach-auth/jwt-secret"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/kavach-auth/redis-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/kavach-auth",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/v1/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Create ECS Cluster and Service

```bash
# Create ECS cluster
aws ecs create-cluster \
    --cluster-name kavach-auth-cluster \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# Register task definition
aws ecs register-task-definition \
    --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
    --cluster kavach-auth-cluster \
    --service-name kavach-auth-service \
    --task-definition kavach-auth-task:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345],assignPublicIp=DISABLED}" \
    --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kavach-auth-tg/1234567890123456,containerName=kavach-auth,containerPort=3000
```

## Step 4: Load Balancer Setup

### Application Load Balancer

```bash
# Create target group
aws elbv2 create-target-group \
    --name kavach-auth-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id vpc-12345 \
    --target-type ip \
    --health-check-path /api/v1/health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3

# Create load balancer
aws elbv2 create-load-balancer \
    --name kavach-auth-alb \
    --subnets subnet-12345 subnet-67890 \
    --security-groups sg-12345

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/kavach-auth-alb/1234567890123456 \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012 \
    --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kavach-auth-tg/1234567890123456
```

## Step 5: SSL Certificate

### Request Certificate with ACM

```bash
# Request certificate
aws acm request-certificate \
    --domain-name auth.yourdomain.com \
    --validation-method DNS \
    --subject-alternative-names "*.yourdomain.com"

# Validate certificate (follow DNS validation instructions)
aws acm describe-certificate \
    --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

## Step 6: Environment Variables and Secrets

### Store Secrets in Parameter Store

```bash
# Database URL
aws ssm put-parameter \
    --name "/kavach-auth/database-url" \
    --value "postgresql://postgres:password@kavach-auth-db.cluster-xyz.us-east-1.rds.amazonaws.com:5432/kavach_auth" \
    --type "SecureString"

# JWT Secret
aws ssm put-parameter \
    --name "/kavach-auth/jwt-secret" \
    --value "your-super-secure-jwt-secret-key" \
    --type "SecureString"

# Redis URL
aws ssm put-parameter \
    --name "/kavach-auth/redis-url" \
    --value "redis://kavach-auth-redis.abc123.cache.amazonaws.com:6379" \
    --type "SecureString"

# SMTP Configuration
aws ssm put-parameter \
    --name "/kavach-auth/smtp-host" \
    --value "email-smtp.us-east-1.amazonaws.com" \
    --type "String"

aws ssm put-parameter \
    --name "/kavach-auth/smtp-user" \
    --value "AKIAIOSFODNN7EXAMPLE" \
    --type "SecureString"

aws ssm put-parameter \
    --name "/kavach-auth/smtp-pass" \
    --value "your-ses-smtp-password" \
    --type "SecureString"
```

## Step 7: Monitoring and Logging

### CloudWatch Setup

```bash
# Create log group
aws logs create-log-group \
    --log-group-name /ecs/kavach-auth

# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "KavachAuthDashboard" \
    --dashboard-body file://dashboard.json
```

### CloudWatch Dashboard Configuration

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "kavach-auth-service", "ClusterName", "kavach-auth-cluster"],
          [".", "MemoryUtilization", ".", ".", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Service Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/kavach-auth-alb/1234567890123456"],
          [".", "ResponseTime", ".", "."],
          [".", "HTTPCode_Target_2XX_Count", ".", "."],
          [".", "HTTPCode_Target_4XX_Count", ".", "."],
          [".", "HTTPCode_Target_5XX_Count", ".", "."]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Load Balancer Metrics"
      }
    }
  ]
}
```

## Step 8: Auto Scaling

### ECS Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --resource-id service/kavach-auth-cluster/kavach-auth-service \
    --scalable-dimension ecs:service:DesiredCount \
    --min-capacity 2 \
    --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --resource-id service/kavach-auth-cluster/kavach-auth-service \
    --scalable-dimension ecs:service:DesiredCount \
    --policy-name kavach-auth-cpu-scaling \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### Scaling Policy Configuration

```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 300,
  "ScaleInCooldown": 300
}
```

## Step 9: Database Migration

### Run Database Migrations

```bash
# Create ECS task for migrations
aws ecs run-task \
    --cluster kavach-auth-cluster \
    --task-definition kavach-auth-migration-task \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=DISABLED}" \
    --overrides '{"containerOverrides":[{"name":"kavach-auth","command":["npm","run","db:migrate"]}]}'
```

## Step 10: Route 53 DNS

### Configure DNS

```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone \
    --name yourdomain.com \
    --caller-reference $(date +%s)

# Create A record pointing to ALB
aws route53 change-resource-record-sets \
    --hosted-zone-id Z123456789 \
    --change-batch file://dns-record.json
```

### DNS Record Configuration

```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "auth.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "kavach-auth-alb-1234567890.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true,
          "HostedZoneId": "Z35SXDOTRQ7X7K"
        }
      }
    }
  ]
}
```

## Security Best Practices

### IAM Roles and Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:123456789012:parameter/kavach-auth/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:us-east-1:123456789012:log-group:/ecs/kavach-auth:*"
      ]
    }
  ]
}
```

### Security Groups

- ALB: Allow HTTP (80) and HTTPS (443) from internet
- ECS: Allow port 3000 from ALB only
- RDS: Allow port 5432 from ECS only
- Redis: Allow port 6379 from ECS only

## Cost Optimization

### Resource Sizing

- **ECS Tasks**: Start with 0.5 vCPU, 1GB memory
- **RDS**: Use db.t3.micro for development, db.t3.small for production
- **ElastiCache**: Use cache.t3.micro for small workloads
- **ALB**: Pay per hour and per LCU consumed

### Cost Monitoring

```bash
# Set up billing alerts
aws cloudwatch put-metric-alarm \
    --alarm-name "KavachAuthHighCost" \
    --alarm-description "Alert when monthly cost exceeds $100" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 86400 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=Currency,Value=USD \
    --evaluation-periods 1
```

## Troubleshooting

### Common Issues

**ECS Tasks Not Starting:**
```bash
# Check task definition
aws ecs describe-task-definition --task-definition kavach-auth-task

# Check service events
aws ecs describe-services --cluster kavach-auth-cluster --services kavach-auth-service

# Check task logs
aws logs get-log-events --log-group-name /ecs/kavach-auth --log-stream-name ecs/kavach-auth/task-id
```

**Database Connection Issues:**
```bash
# Test database connectivity from ECS task
aws ecs run-task \
    --cluster kavach-auth-cluster \
    --task-definition kavach-auth-task \
    --overrides '{"containerOverrides":[{"name":"kavach-auth","command":["npm","run","db:test"]}]}'
```

**Load Balancer Health Check Failures:**
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kavach-auth-tg/1234567890123456

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-12345
```

## Maintenance

### Regular Maintenance Tasks

```bash
# Update ECS service with new image
aws ecs update-service \
    --cluster kavach-auth-cluster \
    --service kavach-auth-service \
    --force-new-deployment

# Scale service
aws ecs update-service \
    --cluster kavach-auth-cluster \
    --service kavach-auth-service \
    --desired-count 4

# Update task definition
aws ecs register-task-definition --cli-input-json file://updated-task-definition.json
aws ecs update-service \
    --cluster kavach-auth-cluster \
    --service kavach-auth-service \
    --task-definition kavach-auth-task:2
```

### Backup Procedures

```bash
# RDS automated backups are enabled by default
# Manual snapshot
aws rds create-db-snapshot \
    --db-instance-identifier kavach-auth-db \
    --db-snapshot-identifier kavach-auth-manual-snapshot-$(date +%Y%m%d)

# ElastiCache backup
aws elasticache create-snapshot \
    --cache-cluster-id kavach-auth-redis \
    --snapshot-name kavach-auth-redis-snapshot-$(date +%Y%m%d)
```

## Next Steps

After successful AWS deployment:

1. Set up CI/CD pipeline with AWS CodePipeline
2. Implement blue-green deployments
3. Configure AWS WAF for additional security
4. Set up cross-region disaster recovery
5. Implement advanced monitoring with AWS X-Ray
6. Consider using AWS App Runner for simpler deployments
7. Implement infrastructure as code with AWS CDK or Terraform