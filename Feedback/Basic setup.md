## Feedback Test 2

[TransferFunctionMeasurement.m](https://git.sonova.com/PCSW-Infra/Common/blob/develop/SysITools/TransferFunctionMeasurement/TransferFunctionMeasurement.m "TransferFunctionMeasurement.m")
[[MLS]] stimuli used

```matlab
durationTfm = 20; % [s], maximum is 30 s

levelTfm = 100; % [dB SPL], maximum is 100 dB SPL

measPoint1 = 'FrontMic'; % 'FrontMic', 'BackMic' or 'Ambient'

measPoint2 = 'BackMic'; % 'FrontMic', 'BackMic' or 'Ambient'
```

>note
>setting the level @120 dBSPL not possible with Louis! Value is hard-coded @100dBSPL
>see this thread [Demec, Ivan: TFM `MaxLoudness` Louis images not supported | G-SO-RD-HD-Team-Verification > SSW.Client-TGA Guardians | Microsoft Teams](https://teams.microsoft.com/l/message/19:0cea8d51dac741dd8c60c6c98eab8854@thread.skype/1778501523058?tenantId=f1ed0701-294e-404c-a13b-f81f707f845b&groupId=af9698c8-4b8b-4111-9fef-9910981ebfce&parentMessageId=1778501523058&teamName=G-SO-RD-HD-Team-Verification&channelName=SSW.Client-TGA%20Guardians&createdTime=1778501523058 "https://teams.microsoft.com/l/message/19:0cea8d51dac741dd8c60c6c98eab8854@thread.skype/1778501523058?tenantId=f1ed0701-294e-404c-a13b-f81f707f845b&groupId=af9698c8-4b8b-4111-9fef-9910981ebfce&parentMessageId=1778501523058&teamName=G-SO-RD-HD-Team-Verification&channelName=SSW.Client-TGA%20Guardians&createdTime=1778501523058")
## Different Tygon tubes used (hard and soft)
![[MeasurementSetup.png]]

- Hard tube better for P rec (higher est. feedback threshold)
- Soft tube better for M rec

## Results assessed

`tfa = TransferFunctionAnalysis();`
### Correlation

`tfa.GetCorrelation`
'feedback 1st path' or Front mic and 'feedback 2nd path' or Back mic

```matlab
correlation(index, :) = abs(measurment.crossCorrelation).^2 ./ measurment.autoCorrelationDacMon;

correlation2(index, :) = abs(measurment2.crossCorrelation).^2 ./ measurment2.autoCorrelationDacMon;
```

### TransferFunction

`tfa.GetTransferFunction`
Estimated transfer function and phase

```matlab
case 'Raw'

measurment1 = obj.measurements{index}.correlation;

measurment2 = obj.measurements{index}.correlation2;

% remove DC and Nyquist

measurment1.autoCorrelationDacMon = measurment1.autoCorrelationDacMon(2:64);

measurment1.crossCorrelation = measurment1.crossCorrelation(2:64);

measurment1.autoCorrelationInput = measurment1.autoCorrelationInput(2:64);

measurment2.autoCorrelationDacMon = measurment2.autoCorrelationDacMon(2:64);

measurment2.crossCorrelation = measurment2.crossCorrelation(2:64);

measurment2.autoCorrelationInput = measurment2.autoCorrelationInput(2:64);
```
