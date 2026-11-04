# Jenkins for this computer: runs the project's Jenkinsfile, which builds the farm images and deploys them to
# this computer's Docker (the same compose project as `docker compose up` in the project folder).
# It talks to Docker through the mounted /var/run/docker.sock, so it needs the Docker CLI and compose plugin.
# The current LTS: jenkins-plugin-cli installs the newest plugins, which need a recent Jenkins.
FROM jenkins/jenkins:lts-jdk21

USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# The admin user and the deploy job come from casc.yaml (Configuration as Code); no setup wizard.
COPY casc.yaml /usr/share/jenkins/casc.yaml
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false" \
    CASC_JENKINS_CONFIG=/usr/share/jenkins/casc.yaml
