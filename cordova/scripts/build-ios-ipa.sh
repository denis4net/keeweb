#!/bin/sh

APP_NAME=KeeWeb
pushd platforms/ios
xcodebuild -workspace ${APP_NAME}.xcworkspace -scheme ${APP_NAME} -sdk iphoneos -configuration "Ad Hoc" archive -archivePath $PWD/build/${APP_NAME}.xcarchive
xcodebuild -exportArchive -archivePath $PWD/build/${APP_NAME}.xcarchive -exportPath $PWD/build
popd