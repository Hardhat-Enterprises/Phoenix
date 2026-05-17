# AI012 Anomaly Model Recommendation

Recommended unsupervised candidate: one_class_svm. This ranks unsupervised runs by high detection stability and anomaly-rate alignment with the configured contamination target.

Recommended supervised-threshold candidate: autoencoder. This ranks supervised runs by held-out F1, then PR-AUC, recall, and precision.
