if [ "$JobType" = "Nightly" ] | [ "$JobType" = "IntegrationPipeline" ];
then
# export VERSION=v$nodeVersion
# [ -d /apps/nodejs ] && rm -rf /apps/nodejs && mkdir /apps/nodejs
# [ ! -d /apps/nodejs ] && mkdir /apps/nodejs
# tar -xJvf /kits/tea/system/Node/node-$VERSION.tar.xz -C /apps/nodejs
# export PATH=$PATH:/apps/nodejs/node-$VERSION-linux-x64/bin
# tar -xJvf /home2/yytcadm/Desktop/ServiceValidation/AWLogin/node-v12.18.4-linux-x64.tar.xz -C /apps/nodejs
unzip -o /home2/yytcadm/Desktop/ServiceValidation/AWLogin/node_modules.zip -d /home2/yytcadm/Desktop/ServiceValidation/AWLogin
unzip -o /home2/yytcadm/Desktop/ServiceValidation/AWItemCreationIndexSearch/node_modules.zip -d /home2/yytcadm/Desktop/ServiceValidation/AWItemCreationIndexSearch
if [ $? -eq 0 ]
then
    echo "Success: NodeJS files were unzipped successfully....exiting"
    exit 0
else
    echo "Err: Couldn't unzip NodeJS files "
    exit 1
fi
fi