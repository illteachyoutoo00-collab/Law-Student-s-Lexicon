---
language: mn
license: apache-2.0
tags:
- whisper-event
- hf-asr-leaderboard
- generated_from_multiple_datasets
datasets:
- mozilla-foundation/common_voice_11_0
- google/fleurs
- bayartsogt/ulaanbal-v0
- bayartsogt/youtube-mongolian-v1
metrics:
- wer
- cer
model-index:
- name: whisper-tiny-mn-9
  results:
  - task:
      type: automatic-speech-recognition
      name: Automatic Speech Recognition
    dataset:
      name: Common Voice 11.0
      type: mozilla-foundation/common_voice_11_0
      config: mn
      split: test
    metrics:
    - type: wer
      value: 45.51015949311776
      name: Wer
    - type: cer
      value: 17.33769077861258
      name: Cer
---

<!-- This model card has been generated automatically according to the information the Trainer had access to. You
should probably proofread and complete it, then remove this comment. -->

# whisper-tiny-mn-9

This model is a fine-tuned version of [openai/whisper-tiny](https://huggingface.co/openai/whisper-tiny) on the None dataset.
It achieves the following results on the evaluation set:
- Loss: 0.3885
- Wer: 45.5102
- Cer: 17.3377

## Model description

More information needed

## Intended uses & limitations

More information needed

## Training and evaluation data

More information needed

## Training procedure

### Training hyperparameters

The following hyperparameters were used during training:
- learning_rate: 1e-05
- train_batch_size: 64
- eval_batch_size: 64
- seed: 42
- optimizer: Adam with betas=(0.9,0.999) and epsilon=1e-08
- lr_scheduler_type: linear
- lr_scheduler_warmup_steps: 500
- training_steps: 20000
- mixed_precision_training: Native AMP

### Training results

| Training Loss | Epoch | Step  | Validation Loss | Wer     | Cer     |
|:-------------:|:-----:|:-----:|:---------------:|:-------:|:-------:|
| 0.587         | 0.69  | 1000  | 0.6937          | 75.6336 | 29.6764 |
| 0.4536        | 1.39  | 2000  | 0.5539          | 64.8187 | 24.8324 |
| 0.3798        | 2.08  | 3000  | 0.4963          | 57.7944 | 22.1842 |
| 0.3423        | 2.77  | 4000  | 0.4661          | 54.3751 | 20.9705 |
| 0.3122        | 3.47  | 5000  | 0.4449          | 52.5945 | 20.3405 |
| 0.3002        | 4.16  | 6000  | 0.4285          | 50.5080 | 19.3499 |
| 0.2842        | 4.85  | 7000  | 0.4171          | 49.3937 | 19.0282 |
| 0.2655        | 5.54  | 8000  | 0.4099          | 48.6727 | 18.6045 |
| 0.2555        | 6.24  | 9000  | 0.4035          | 48.2084 | 18.3392 |
| 0.2525        | 6.93  | 10000 | 0.3990          | 47.3290 | 17.8338 |
| 0.243         | 7.62  | 11000 | 0.3963          | 47.0559 | 18.2524 |
| 0.2358        | 8.32  | 12000 | 0.3948          | 46.7337 | 17.8186 |
| 0.2288        | 9.01  | 13000 | 0.3901          | 46.5480 | 17.9172 |
| 0.2171        | 9.7   | 14000 | 0.3910          | 46.0236 | 17.6266 |
| 0.2184        | 10.4  | 15000 | 0.3904          | 46.4387 | 17.8228 |
| 0.2099        | 11.09 | 16000 | 0.3893          | 45.9744 | 17.4379 |
| 0.216         | 11.78 | 17000 | 0.3889          | 45.6194 | 17.2939 |
| 0.2095        | 12.47 | 18000 | 0.3895          | 45.7887 | 17.4438 |
| 0.2056        | 13.17 | 19000 | 0.3882          | 45.6085 | 17.2888 |
| 0.2064        | 13.86 | 20000 | 0.3885          | 45.5102 | 17.3377 |


### Framework versions

- Transformers 4.26.0.dev0
- Pytorch 1.13.0+cu117
- Datasets 2.7.1.dev0
- Tokenizers 0.13.2
